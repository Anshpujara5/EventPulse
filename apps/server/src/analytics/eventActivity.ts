import type { AnalyticsScope } from "./analyticsScope";
import { percentageOfTotal, toCount } from "./shared/numbers";
import { prisma } from "../config/prisma";

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

interface RecentEventRow {
  id: string;
  name: string;
  projectName: string;
  createdAt: Date;
}

interface PropertyKeyRow {
  key: string;
  count: bigint;
}

export interface TopEvent {
  name: string;
  count: number;
  percentage: number;
}

export interface ProjectEventCount {
  projectId: string;
  projectName: string;
  count: number;
  percentage: number;
}

export interface RecentEvent {
  id: string;
  name: string;
  projectName: string;
  createdAt: Date;
}

export interface TopProperty {
  key: string;
  count: number;
}

export interface EventActivityResult {
  totalEvents: number;
  eventsToday: number;
  uniqueEventNames: number;
  activeProjects: number;
  topEvents: TopEvent[];
  eventsByProject: ProjectEventCount[];
  recentActivity: RecentEvent[];
  topProperties: TopProperty[];
  totalActiveProjects: number | null;
}

export async function fetchEventActivity(
  scope: AnalyticsScope,
): Promise<EventActivityResult> {
  const [
    totalResult,
    todayResult,
    uniqueNamesResult,
    activeProjectsResult,
    topEventRows,
    projectEventRows,
    recentEventRows,
    propertyKeyRows,
    totalActiveProjectsResult,
  ] = await Promise.all([
    // Total events matching the current project + range scope
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS count
      FROM "Event"
      WHERE ${scope.sql.currentEvent}
    `,

    // Events today (since midnight, DB session timezone) — fixed window,
    // not affected by range, matching the events page's own "today".
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS count
      FROM "Event"
      WHERE ${scope.sql.todayEvent}
    `,

    // Unique event names within the current scope
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(DISTINCT name) AS count
      FROM "Event"
      WHERE ${scope.sql.currentEvent}
    `,

    // Distinct projects with events within the current scope
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(DISTINCT "projectId") AS count
      FROM "Event"
      WHERE ${scope.sql.currentEvent}
    `,

    // Top 10 event names by count
    prisma.$queryRaw<TopEventRow[]>`
      SELECT name, COUNT(*) AS count
      FROM "Event"
      WHERE ${scope.sql.currentEvent}
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10
    `,

    // Event counts per project (join to get name)
    prisma.$queryRaw<ProjectEventRow[]>`
      SELECT e."projectId", p.name AS "projectName", COUNT(*) AS count
      FROM "Event" e
      JOIN "Project" p ON p.id = e."projectId"
      WHERE ${scope.sql.currentAliasedEvent}
      GROUP BY e."projectId", p.name
      ORDER BY count DESC
      LIMIT 10
    `,

    // 10 most recent events with project name
    prisma.$queryRaw<RecentEventRow[]>`
      SELECT e.id, e.name, p.name AS "projectName", e."createdAt"
      FROM "Event" e
      JOIN "Project" p ON p.id = e."projectId"
      WHERE ${scope.sql.currentAliasedEvent}
      ORDER BY e."createdAt" DESC
      LIMIT 10
    `,

    // Top-level property keys used across events (no nested traversal —
    // just the top-level jsonb keys, kept simple on purpose)
    prisma.$queryRaw<PropertyKeyRow[]>`
      SELECT key, COUNT(*) AS count
      FROM "Event" e, jsonb_object_keys(e.properties) AS key
      WHERE ${scope.sql.currentAliasedEvent}
      GROUP BY key
      ORDER BY count DESC
      LIMIT 10
    `,

    // Total ACTIVE projects owned by the user, for the inactive-project
    // insight. Only meaningful for the all-projects scope.
    scope.projectId
      ? Promise.resolve([] as CountRow[])
      : prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS count
          FROM "Project"
          WHERE ${scope.sql.ownedProject} AND status = 'ACTIVE'
        `,
  ]);

  const totalEvents = toCount(totalResult[0]?.count);

  return {
    totalEvents,
    eventsToday: toCount(todayResult[0]?.count),
    uniqueEventNames: toCount(uniqueNamesResult[0]?.count),
    activeProjects: toCount(activeProjectsResult[0]?.count),
    topEvents: topEventRows.map((row) => ({
      name: row.name,
      count: toCount(row.count),
      percentage: percentageOfTotal(toCount(row.count), totalEvents),
    })),
    eventsByProject: projectEventRows.map((row) => ({
      projectId: row.projectId,
      projectName: row.projectName,
      count: toCount(row.count),
      percentage: percentageOfTotal(toCount(row.count), totalEvents),
    })),
    recentActivity: recentEventRows.map((row) => ({
      id: row.id,
      name: row.name,
      projectName: row.projectName,
      createdAt: row.createdAt,
    })),
    topProperties: propertyKeyRows.map((row) => ({
      key: row.key,
      count: toCount(row.count),
    })),
    totalActiveProjects: scope.projectId
      ? null
      : toCount(totalActiveProjectsResult[0]?.count),
  };
}
