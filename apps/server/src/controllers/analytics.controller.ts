import { Prisma } from "@prisma/client";
import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";

// ---------------------------------------------------------------------------
// Row types for typed raw queries
// ---------------------------------------------------------------------------

interface CountRow {
  count: bigint;
}

interface TopEventRow {
  name: string;
  count: bigint;
}

interface ProjectEventRow {
  projectId: string;
  projectName: string;
  count: bigint;
}

interface HourlyRow {
  hour: string; // ISO-formatted hour bucket
  count: bigint;
}

interface RecentEventRow {
  id: string;
  name: string;
  projectName: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// GET /api/analytics/summary
// ---------------------------------------------------------------------------

export async function getAnalyticsSummaryController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.user.userId;

    // Optional project scope from the header project selector. Uses parameterised
    // Prisma SQL fragments (never string concatenation) so it stays injection-safe.
    const projectId =
      typeof req.query.projectId === "string" && req.query.projectId
        ? req.query.projectId
        : null;
    const projFilter = projectId
      ? Prisma.sql`AND "projectId" = ${projectId}`
      : Prisma.empty;
    const projFilterE = projectId
      ? Prisma.sql`AND e."projectId" = ${projectId}`
      : Prisma.empty;

    const [
      totalResult,
      todayResult,
      last24hResult,
      activeProjectsResult,
      topEvents,
      eventsByProject,
      hourlyTrend,
      recentActivity,
    ] = await Promise.all([
      // Total events ever
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
      `,

      // Events today (since midnight UTC)
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
          AND "createdAt" >= CURRENT_DATE
        ${projFilter}
      `,

      // Events in the last 24 hours
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
          AND "createdAt" >= NOW() - INTERVAL '24 hours'
        ${projFilter}
      `,

      // Number of distinct projects that have received events
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(DISTINCT "projectId") AS count
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
      `,

      // Top 10 event names by count
      prisma.$queryRaw<TopEventRow[]>`
        SELECT name, COUNT(*) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
        GROUP BY name
        ORDER BY count DESC
        LIMIT 10
      `,

      // Event counts per project (join to get name)
      prisma.$queryRaw<ProjectEventRow[]>`
        SELECT e."projectId", p.name AS "projectName", COUNT(*) AS count
        FROM "Event" e
        JOIN "Project" p ON p.id = e."projectId"
        WHERE e."userId" = ${userId}
        ${projFilterE}
        GROUP BY e."projectId", p.name
        ORDER BY count DESC
        LIMIT 10
      `,

      // Hourly bucketed counts for the last 24 hours (24 buckets)
      prisma.$queryRaw<HourlyRow[]>`
        SELECT
          TO_CHAR(
            DATE_TRUNC('hour', "createdAt" AT TIME ZONE 'UTC'),
            'YYYY-MM-DD"T"HH24:MI:SS"Z"'
          ) AS hour,
          COUNT(*) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
          AND "createdAt" >= NOW() - INTERVAL '24 hours'
        ${projFilter}
        GROUP BY DATE_TRUNC('hour', "createdAt" AT TIME ZONE 'UTC')
        ORDER BY hour ASC
      `,

      // 10 most recent events with project name
      prisma.$queryRaw<RecentEventRow[]>`
        SELECT e.id, e.name, p.name AS "projectName", e."createdAt"
        FROM "Event" e
        JOIN "Project" p ON p.id = e."projectId"
        WHERE e."userId" = ${userId}
        ${projFilterE}
        ORDER BY e."createdAt" DESC
        LIMIT 10
      `,
    ]);

    return res.json({
      success: true,
      data: {
        summary: {
          totalEvents: Number(totalResult[0]?.count ?? 0),
          eventsToday: Number(todayResult[0]?.count ?? 0),
          eventsLast24h: Number(last24hResult[0]?.count ?? 0),
          activeProjects: Number(activeProjectsResult[0]?.count ?? 0),
        },
        topEvents: topEvents.map((r) => ({
          name: r.name,
          count: Number(r.count),
        })),
        eventsByProject: eventsByProject.map((r) => ({
          projectId: r.projectId,
          projectName: r.projectName,
          count: Number(r.count),
        })),
        hourlyTrend: hourlyTrend.map((r) => ({
          hour: r.hour,
          count: Number(r.count),
        })),
        recentActivity: recentActivity.map((r) => ({
          id: r.id,
          name: r.name,
          projectName: r.projectName,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("[getAnalyticsSummary]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
