import { Prisma } from "@prisma/client";
import crypto from "crypto";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import {
  authenticateApiKey,
  extractRawApiKey,
} from "../ingestion/apiKeyAuth";
import {
  serializeProperties,
  validateEventName,
  validateIdempotencyKey,
  validateProperties,
} from "../ingestion/envelope";
import { collectContractWarnings } from "../ingestion/contractWarnings";
import {
  findEventByIdempotencyKey,
  isIdempotencyUniqueViolation,
  resolveIdempotencyKey,
} from "../ingestion/idempotency";
import { validateShopperId } from "../ingestion/shopperIds";
import type { AuthRequest } from "../middleware/auth.middleware";
import { evaluateAlertsForEvent } from "../utils/alertEvaluation";
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
  customerId?: string | null;
  sessionId?: string | null;
  // joined fields from project / apiKey
  projectName?: string;
  projectDomain?: string;
  apiKeyName?: string;
  keyPrefix?: string;
}

// ---------------------------------------------------------------------------
// POST /api/events/ingest  — authenticated via raw API key (not JWT)
// ---------------------------------------------------------------------------

export async function ingestEventController(req: Request, res: Response) {
  try {
    // 1. Extract raw key from Authorization or x-api-key header
    const rawKey = extractRawApiKey(
      req.headers.authorization,
      req.headers["x-api-key"],
    );

    if (!rawKey) {
      return res.status(401).json({
        success: false,
        message: "API key is required (Authorization: Bearer <key> or x-api-key header)",
      });
    }

    // 2. Hash and look up
    const authentication = await authenticateApiKey(rawKey);

    if (authentication.status === "invalid") {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    if (authentication.status === "revoked") {
      return res.status(403).json({
        success: false,
        message: "API key has been revoked",
      });
    }

    // Block ingestion for archived (inactive) projects. Reject before storing
    // the event or touching lastUsedAt — nothing is persisted for a paused
    // project. Restoring the project re-enables ingestion.
    if (authentication.status === "projectInactive") {
      return res.status(403).json({
        success: false,
        message:
          "Event ingestion is paused for this project. Restore the project to resume ingestion.",
      });
    }

    const apiKeyRow = authentication.apiKey;

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
    const {
      name,
      properties,
      customerId: rawCustomerId,
      sessionId: rawSessionId,
      idempotencyKey: bodyIdempotencyKey,
    } = req.body as {
      name: unknown;
      properties: unknown;
      customerId?: unknown;
      sessionId?: unknown;
      idempotencyKey?: unknown;
    };

    const eventNameResult = validateEventName(name);
    if (eventNameResult.error !== null) {
      return res.status(400).json({
        success: false,
        message: eventNameResult.error,
      });
    }

    const eventName = eventNameResult.value;

    // customerId/sessionId are required for all new events (the DB columns are
    // nullable only so rows ingested before these fields existed stay valid).
    const customerIdResult = validateShopperId(rawCustomerId, "customerId");
    if (customerIdResult.error !== null) {
      return res.status(400).json({
        success: false,
        message: customerIdResult.error,
      });
    }

    const sessionIdResult = validateShopperId(rawSessionId, "sessionId");
    if (sessionIdResult.error !== null) {
      return res.status(400).json({
        success: false,
        message: sessionIdResult.error,
      });
    }

    const customerId = customerIdResult.value;
    const sessionId = sessionIdResult.value;

    const propertiesResult = validateProperties(properties);
    if (propertiesResult.error !== null) {
      return res.status(400).json({
        success: false,
        message: propertiesResult.error,
      });
    }

    const safeProperties = propertiesResult.value;

    // 5. Resolve idempotency key — header takes precedence over body field.
    const idempotencyKey = resolveIdempotencyKey(
      req.headers["idempotency-key"],
      bodyIdempotencyKey,
    );
    const idempotencyKeyError = validateIdempotencyKey(idempotencyKey);

    if (idempotencyKeyError !== null) {
      return res.status(400).json({
        success: false,
        message: idempotencyKeyError,
      });
    }

    // 6. If this API key already used this idempotency key, return the
    // original event instead of creating a duplicate.
    if (idempotencyKey) {
      const existing = await findEventByIdempotencyKey(
        apiKeyRow.id,
        idempotencyKey,
      );

      if (existing) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          event: {
            id: existing.id,
            name: existing.name,
            projectId: existing.projectId,
            createdAt: existing.createdAt,
            customerId: existing.customerId ?? null,
            sessionId: existing.sessionId ?? null,
          },
        });
      }
    }

    // 7. Insert event
    const eventId = crypto.randomUUID();
    const propertiesJsonResult = serializeProperties(safeProperties);

    if (propertiesJsonResult.error !== null) {
      return res.status(400).json({
        success: false,
        message: propertiesJsonResult.error,
      });
    }

    const propertiesJson = propertiesJsonResult.value;
    const ipAddress = req.ip ?? req.socket.remoteAddress ?? null;
    const userAgentHeader = req.headers["user-agent"];
    const userAgent = typeof userAgentHeader === "string" ? userAgentHeader : null;

    try {
      await prisma.$executeRaw`
        INSERT INTO "Event" (id, name, properties, "userId", "projectId", "apiKeyId", "createdAt", "idempotencyKey", "ipAddress", "userAgent", "customerId", "sessionId")
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
          ${userAgent},
          ${customerId},
          ${sessionId}
        )
      `;
    } catch (error) {
      // Unique violation on (apiKeyId, idempotencyKey) means a concurrent
      // request already inserted the same idempotency key — treat as a
      // duplicate rather than a failure.
      if (idempotencyKey && isIdempotencyUniqueViolation(error)) {
        const existing = await findEventByIdempotencyKey(
          apiKeyRow.id,
          idempotencyKey,
        );
        if (existing) {
          return res.status(200).json({
            success: true,
            duplicate: true,
            event: {
              id: existing.id,
              name: existing.name,
              projectId: existing.projectId,
              createdAt: existing.createdAt,
              customerId: existing.customerId ?? null,
              sessionId: existing.sessionId ?? null,
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
      Pick<
        EventRow,
        "id" | "name" | "projectId" | "createdAt" | "customerId" | "sessionId"
      >[]
    >`
      SELECT id, name, "projectId", "createdAt", "customerId", "sessionId"
      FROM "Event"
      WHERE id = ${eventId}
    `;

    const contractWarnings = collectContractWarnings({
      name: eventName,
      properties: safeProperties,
    });

    return res.status(201).json({
      success: true,
      duplicate: false,
      event: {
        id: createdEvent.id,
        name: createdEvent.name,
        projectId: createdEvent.projectId,
        createdAt: createdEvent.createdAt,
        customerId: createdEvent.customerId ?? null,
        sessionId: createdEvent.sessionId ?? null,
      },
      ...(contractWarnings.length > 0
        ? { warnings: contractWarnings }
        : {}),
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
        e."ipAddress", e."userAgent", e."customerId", e."sessionId",
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
