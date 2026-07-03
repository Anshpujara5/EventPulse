import { Prisma } from "@prisma/client";
import crypto from "crypto";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";
import { evaluateAlertsForEvent } from "../utils/alertEvaluation";
import { hashApiKey } from "../utils/apiKey";
import { checkRateLimit } from "../utils/rateLimit";
import { rangeToInterval } from "../utils/timeRange";

// ---------------------------------------------------------------------------
// Shared types (mirrors Prisma schema — stays correct until prisma generate
// replaces the generated client after the add_events migration is applied)
// ---------------------------------------------------------------------------

interface EventRow {
  id: string;
  name: string;
  properties: Record<string, unknown>;
  userId: string;
  projectId: string;
  apiKeyId: string;
  createdAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  // joined fields from project / apiKey
  projectName?: string;
  projectDomain?: string;
  apiKeyName?: string;
  keyPrefix?: string;
}

interface ActiveApiKeyRow {
  id: string;
  userId: string;
  projectId: string;
  status: string;
  projectStatus: string;
}

// ---------------------------------------------------------------------------
// Ingestion validation limits
// ---------------------------------------------------------------------------

const MAX_EVENT_NAME_LENGTH = 120;
// Serialized properties cap — a simple in-controller guard (Express also caps
// the whole body at its default 100kb). No extra libraries required.
const MAX_PROPERTIES_BYTES = 16 * 1024;
const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
// Reject control characters (newlines, tabs, null, etc.) in event names while
// still allowing names like page_view, checkout.completed, user-signup.
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// POST /api/events/ingest  — authenticated via raw API key (not JWT)
// ---------------------------------------------------------------------------

export async function ingestEventController(req: Request, res: Response) {
  try {
    // 1. Extract raw key from Authorization or x-api-key header
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers["x-api-key"];

    let rawKey: string | undefined;

    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      rawKey = authHeader.slice(7).trim();
    } else if (typeof xApiKey === "string") {
      rawKey = xApiKey.trim();
    }

    if (!rawKey) {
      return res.status(401).json({
        success: false,
        message: "API key is required (Authorization: Bearer <key> or x-api-key header)",
      });
    }

    // 2. Hash and look up
    const keyHash = hashApiKey(rawKey);

    const [apiKeyRow] = await prisma.$queryRaw<ActiveApiKeyRow[]>`
      SELECT a.id, a."userId", a."projectId", a.status, p.status AS "projectStatus"
      FROM "ApiKey" a
      JOIN "Project" p ON p.id = a."projectId"
      WHERE a."keyHash" = ${keyHash}
      LIMIT 1
    `;

    if (!apiKeyRow) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    if (apiKeyRow.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "API key has been revoked",
      });
    }

    // Block ingestion for archived (inactive) projects. Reject before storing
    // the event or touching lastUsedAt — nothing is persisted for a paused
    // project. Restoring the project re-enables ingestion.
    if (apiKeyRow.projectStatus !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message:
          "Event ingestion is paused for this project. Restore the project to resume ingestion.",
      });
    }

    // 3. Rate limit — per API key, in-memory. Rejected requests are not
    // stored and do not touch lastUsedAt or alert evaluation.
    const rateLimit = checkRateLimit(apiKeyRow.id);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Try again later.",
      });
    }

    // 4. Validate body
    const { name, properties, idempotencyKey: bodyIdempotencyKey } =
      req.body as {
        name: unknown;
        properties: unknown;
        idempotencyKey?: unknown;
      };

    if (typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Event name is required and must be a string",
      });
    }

    const eventName = name.trim();

    if (eventName.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Event name must not be empty",
      });
    }

    if (eventName.length > MAX_EVENT_NAME_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Event name must be between 1 and ${MAX_EVENT_NAME_LENGTH} characters`,
      });
    }

    if (hasControlChars(eventName)) {
      return res.status(400).json({
        success: false,
        message: "Event name must not contain control characters",
      });
    }

    if (
      properties !== undefined &&
      (typeof properties !== "object" ||
        properties === null ||
        Array.isArray(properties))
    ) {
      return res.status(400).json({
        success: false,
        message: "properties must be a plain JSON object if provided",
      });
    }

    const safeProperties =
      properties !== undefined
        ? (properties as Record<string, unknown>)
        : {};

    // 5. Resolve idempotency key — header takes precedence over body field.
    const headerIdempotencyKey = req.headers["idempotency-key"];
    const rawIdempotencyKey =
      typeof headerIdempotencyKey === "string"
        ? headerIdempotencyKey
        : typeof bodyIdempotencyKey === "string"
          ? bodyIdempotencyKey
          : undefined;
    const idempotencyKey = rawIdempotencyKey?.trim() || undefined;

    if (idempotencyKey && idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Idempotency-Key must not exceed ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      });
    }

    // 6. If this API key already used this idempotency key, return the
    // original event instead of creating a duplicate.
    if (idempotencyKey) {
      const [existing] = await prisma.$queryRaw<
        Pick<EventRow, "id" | "name" | "projectId" | "createdAt">[]
      >`
        SELECT id, name, "projectId", "createdAt"
        FROM "Event"
        WHERE "apiKeyId" = ${apiKeyRow.id} AND "idempotencyKey" = ${idempotencyKey}
        LIMIT 1
      `;

      if (existing) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          event: {
            id: existing.id,
            name: existing.name,
            projectId: existing.projectId,
            createdAt: existing.createdAt,
          },
        });
      }
    }

    // 7. Insert event
    const eventId = crypto.randomUUID();
    const propertiesJson = JSON.stringify(safeProperties);

    if (propertiesJson.length > MAX_PROPERTIES_BYTES) {
      return res.status(400).json({
        success: false,
        message: `properties payload is too large (max ${
          MAX_PROPERTIES_BYTES / 1024
        }KB)`,
      });
    }

    const ipAddress = req.ip ?? req.socket.remoteAddress ?? null;
    const userAgentHeader = req.headers["user-agent"];
    const userAgent = typeof userAgentHeader === "string" ? userAgentHeader : null;

    try {
      await prisma.$executeRaw`
        INSERT INTO "Event" (id, name, properties, "userId", "projectId", "apiKeyId", "createdAt", "idempotencyKey", "ipAddress", "userAgent")
        VALUES (
          ${eventId},
          ${eventName},
          ${propertiesJson}::jsonb,
          ${apiKeyRow.userId},
          ${apiKeyRow.projectId},
          ${apiKeyRow.id},
          NOW(),
          ${idempotencyKey ?? null},
          ${ipAddress},
          ${userAgent}
        )
      `;
    } catch (error) {
      // Unique violation on (apiKeyId, idempotencyKey) means a concurrent
      // request already inserted the same idempotency key — treat as a
      // duplicate rather than a failure.
      const meta = error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined;
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2010" &&
        typeof meta?.code === "string" &&
        meta.code === "23505";

      if (idempotencyKey && isUniqueViolation) {
        const [existing] = await prisma.$queryRaw<
          Pick<EventRow, "id" | "name" | "projectId" | "createdAt">[]
        >`
          SELECT id, name, "projectId", "createdAt"
          FROM "Event"
          WHERE "apiKeyId" = ${apiKeyRow.id} AND "idempotencyKey" = ${idempotencyKey}
          LIMIT 1
        `;
        if (existing) {
          return res.status(200).json({
            success: true,
            duplicate: true,
            event: {
              id: existing.id,
              name: existing.name,
              projectId: existing.projectId,
              createdAt: existing.createdAt,
            },
          });
        }
      }
      throw error;
    }

    // 8. Update lastUsedAt on the API key
    await prisma.$executeRaw`
      UPDATE "ApiKey"
      SET "lastUsedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${apiKeyRow.id}
    `;

    // 9. Evaluate active alerts for this project/event. Best-effort and
    // never throws — a failure here cannot turn a stored event into a
    // failed ingestion request.
    await evaluateAlertsForEvent({
      userId: apiKeyRow.userId,
      projectId: apiKeyRow.projectId,
      eventName,
    });

    // 10. Return minimal event confirmation
    const [createdEvent] = await prisma.$queryRaw<
      Pick<EventRow, "id" | "name" | "projectId" | "createdAt">[]
    >`
      SELECT id, name, "projectId", "createdAt"
      FROM "Event"
      WHERE id = ${eventId}
    `;

    return res.status(201).json({
      success: true,
      duplicate: false,
      event: {
        id: createdEvent.id,
        name: createdEvent.name,
        projectId: createdEvent.projectId,
        createdAt: createdEvent.createdAt,
      },
    });
  } catch (error) {
    console.error("[ingestEvent]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// ---------------------------------------------------------------------------
// GET /api/events  — authenticated via JWT (dashboard user)
// ---------------------------------------------------------------------------

export async function getEventsController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userId = req.user.userId;

    // Optional query filters. All values are bound as parameters via Prisma.sql
    // fragments (never string concatenation) so the query stays injection-safe.
    const projectId =
      typeof req.query.projectId === "string" ? req.query.projectId : null;
    const eventName =
      typeof req.query.name === "string" ? req.query.name : null;
    const rangeInterval = rangeToInterval(req.query.range);
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 200
      ? limitRaw
      : 50;

    const projFilter = projectId
      ? Prisma.sql`AND e."projectId" = ${projectId}`
      : Prisma.empty;
    const nameFilter = eventName
      ? Prisma.sql`AND e.name ILIKE ${`%${eventName}%`}`
      : Prisma.empty;
    const rangeFilter = rangeInterval
      ? Prisma.sql`AND e."createdAt" >= NOW() - ${rangeInterval}::interval`
      : Prisma.empty;

    const events = await prisma.$queryRaw<EventRow[]>`
      SELECT
        e.id, e.name, e.properties, e."userId", e."projectId", e."apiKeyId", e."createdAt",
        e."ipAddress", e."userAgent",
        p.name AS "projectName", p.domain AS "projectDomain",
        a.name AS "apiKeyName", a."keyPrefix"
      FROM "Event" e
      JOIN "Project" p ON p.id = e."projectId"
      JOIN "ApiKey"  a ON a.id = e."apiKeyId"
      WHERE e."userId" = ${userId}
      ${projFilter}
      ${nameFilter}
      ${rangeFilter}
      ORDER BY e."createdAt" DESC
      LIMIT ${limit}
    `;

    // Total/today are unfiltered (all projects, all time) — a stable,
    // always-on-screen headline number. "matching" reuses the exact same
    // filter fragments as the list query above, so the UI can honestly show
    // how many events match the current project/range/search scope even
    // though only `limit` rows are returned.
    const [[totals], [matchingRow]] = await Promise.all([
      prisma.$queryRaw<{ total: bigint; today: bigint }[]>`
        SELECT
          COUNT(*)                                               AS total,
          COUNT(*) FILTER (WHERE e."createdAt" >= CURRENT_DATE)  AS today
        FROM "Event" e
        WHERE e."userId" = ${userId}
      `,
      prisma.$queryRaw<{ matching: bigint }[]>`
        SELECT COUNT(*) AS matching
        FROM "Event" e
        WHERE e."userId" = ${userId}
        ${projFilter}
        ${nameFilter}
        ${rangeFilter}
      `,
    ]);

    return res.json({
      success: true,
      data: {
        events,
        summary: {
          total: Number(totals.total),
          today: Number(totals.today),
          matching: Number(matchingRow.matching),
        },
      },
    });
  } catch (error) {
    console.error("[getEvents]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
