import { Prisma } from "@prisma/client";
import crypto from "crypto";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";
import { hashApiKey } from "../utils/apiKey";
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

    // 3. Validate body
    const { name, properties } = req.body as {
      name: unknown;
      properties: unknown;
    };

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Event name is required and must be a non-empty string",
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
        message: "properties must be a plain object if provided",
      });
    }

    const safeProperties =
      properties !== undefined
        ? (properties as Record<string, unknown>)
        : {};

    // 4. Insert event
    const eventId = crypto.randomUUID();
    const propertiesJson = JSON.stringify(safeProperties);

    await prisma.$executeRaw`
      INSERT INTO "Event" (id, name, properties, "userId", "projectId", "apiKeyId", "createdAt")
      VALUES (
        ${eventId},
        ${name.trim()},
        ${propertiesJson}::jsonb,
        ${apiKeyRow.userId},
        ${apiKeyRow.projectId},
        ${apiKeyRow.id},
        NOW()
      )
    `;

    // 5. Update lastUsedAt on the API key
    await prisma.$executeRaw`
      UPDATE "ApiKey"
      SET "lastUsedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${apiKeyRow.id}
    `;

    // 6. Return minimal event confirmation
    const [createdEvent] = await prisma.$queryRaw<
      Pick<EventRow, "id" | "name" | "projectId" | "createdAt">[]
    >`
      SELECT id, name, "projectId", "createdAt"
      FROM "Event"
      WHERE id = ${eventId}
    `;

    return res.status(201).json({
      success: true,
      message: "Event ingested successfully",
      data: {
        event: createdEvent,
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

    // Count totals for summary cards
    const [totals] = await prisma.$queryRaw<
      { total: bigint; today: bigint }[]
    >`
      SELECT
        COUNT(*)                                                        AS total,
        COUNT(*) FILTER (WHERE e."createdAt" >= CURRENT_DATE)          AS today
      FROM "Event" e
      WHERE e."userId" = ${userId}
    `;

    return res.json({
      success: true,
      data: {
        events,
        summary: {
          total: Number(totals.total),
          today: Number(totals.today),
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
