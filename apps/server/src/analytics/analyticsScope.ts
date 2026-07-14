import { Prisma } from "@prisma/client";
import {
  parseCustomDateRange,
  rangeToInterval,
  type CustomDateRange,
  type TimeRangeToken,
} from "../utils/timeRange";

export type AnalyticsRangeKey = TimeRangeToken | "custom";
export type AnalyticsTimezone = "database-session";

export type AnalyticsTimeBoundary =
  | { kind: "calendar-date"; value: string }
  | { kind: "relative-now"; interval: string };

export interface AnalyticsPeriod {
  startInclusive: AnalyticsTimeBoundary | null;
  endExclusive: AnalyticsTimeBoundary | null;
}

interface AnalyticsRangeMetadataBase {
  period: AnalyticsPeriod;
  dayCount: number | null;
  includesToday: boolean;
}

type AnalyticsRangeMetadata =
  | (AnalyticsRangeMetadataBase & {
      key: "custom";
      custom: CustomDateRange;
      dayCount: number;
      isAllTime: false;
      isCustom: true;
    })
  | (AnalyticsRangeMetadataBase & {
      key: TimeRangeToken;
      custom: null;
      isAllTime: boolean;
      isCustom: false;
    });

interface AnalyticsComparisonScope {
  currentRange: AnalyticsPeriod;
  previousRange: AnalyticsPeriod;
  label: string;
}

interface AnalyticsScopeSql {
  ownedProject: Prisma.Sql;
  ownedEvent: Prisma.Sql;
  ownedAliasedEvent: Prisma.Sql;
  currentEvent: Prisma.Sql;
  currentAliasedEvent: Prisma.Sql;
  todayEvent: Prisma.Sql;
  comparisonCurrentRange: Prisma.Sql;
  comparisonPreviousRange: Prisma.Sql;
}

/**
 * One request-level definition of analytics ownership, project, and time scope.
 * Calendar and rolling boundaries intentionally use PostgreSQL's session clock
 * and timezone, matching the existing naive Event.createdAt behavior.
 */
export interface AnalyticsScope {
  userId: string;
  projectId: string | null;
  timezone: AnalyticsTimezone;
  range: AnalyticsRangeMetadata;
  comparison: AnalyticsComparisonScope;
  checkTodayActivity: boolean;
  sql: AnalyticsScopeSql;
}

export type AnalyticsScopeResult =
  | { valid: true; value: AnalyticsScope }
  | { valid: false; message: string };

interface CreateAnalyticsScopeInput {
  userId: string;
  projectId: unknown;
  range: unknown;
  from: unknown;
  to: unknown;
  now?: Date;
}

interface EventColumns {
  userId: Prisma.Sql;
  projectId: Prisma.Sql;
  createdAt: Prisma.Sql;
}

const EVENT_COLUMNS: EventColumns = {
  userId: Prisma.sql`"userId"`,
  projectId: Prisma.sql`"projectId"`,
  createdAt: Prisma.sql`"createdAt"`,
};

const ALIASED_EVENT_COLUMNS: EventColumns = {
  userId: Prisma.sql`e."userId"`,
  projectId: Prisma.sql`e."projectId"`,
  createdAt: Prisma.sql`e."createdAt"`,
};

const PRESET_DAY_COUNTS: Record<Exclude<TimeRangeToken, "all">, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

const COMPARISON_WINDOWS: Record<
  TimeRangeToken,
  { current: string; previous: string; label: string }
> = {
  "24h": {
    current: "24 hours",
    previous: "48 hours",
    label: "previous 24 hours",
  },
  "7d": {
    current: "7 days",
    previous: "14 days",
    label: "previous 7 days",
  },
  "30d": {
    current: "30 days",
    previous: "60 days",
    label: "previous 30 days",
  },
  all: {
    current: "7 days",
    previous: "14 days",
    label: "previous 7 days",
  },
};

function resolveRangeToken(value: unknown): TimeRangeToken {
  return value === "24h" || value === "7d" || value === "30d"
    ? value
    : "all";
}

function calendarBoundary(value: string): AnalyticsTimeBoundary {
  return { kind: "calendar-date", value };
}

function relativeBoundary(interval: string): AnalyticsTimeBoundary {
  return { kind: "relative-now", interval };
}

function boundarySql(boundary: AnalyticsTimeBoundary): Prisma.Sql {
  return boundary.kind === "calendar-date"
    ? Prisma.sql`${boundary.value}::date`
    : Prisma.sql`NOW() - ${boundary.interval}::interval`;
}

function periodCondition(
  createdAt: Prisma.Sql,
  period: AnalyticsPeriod,
): Prisma.Sql {
  const { startInclusive, endExclusive } = period;

  if (startInclusive && endExclusive) {
    return Prisma.sql`${createdAt} >= ${boundarySql(startInclusive)}
      AND ${createdAt} < ${boundarySql(endExclusive)}`;
  }

  if (startInclusive) {
    return Prisma.sql`${createdAt} >= ${boundarySql(startInclusive)}`;
  }

  if (endExclusive) {
    return Prisma.sql`${createdAt} < ${boundarySql(endExclusive)}`;
  }

  return Prisma.sql`TRUE`;
}

function ownedEventCondition(
  columns: EventColumns,
  userId: string,
  projectId: string | null,
): Prisma.Sql {
  return projectId
    ? Prisma.sql`${columns.userId} = ${userId}
        AND ${columns.projectId} = ${projectId}`
    : Prisma.sql`${columns.userId} = ${userId}`;
}

function scopedEventCondition(
  ownership: Prisma.Sql,
  createdAt: Prisma.Sql,
  period: AnalyticsPeriod,
): Prisma.Sql {
  return period.startInclusive || period.endExclusive
    ? Prisma.sql`${ownership} AND ${periodCondition(createdAt, period)}`
    : ownership;
}

function buildSqlScope(params: {
  userId: string;
  projectId: string | null;
  range: AnalyticsPeriod;
  comparisonCurrent: AnalyticsPeriod;
  comparisonPrevious: AnalyticsPeriod;
}): AnalyticsScopeSql {
  const ownedEvent = ownedEventCondition(
    EVENT_COLUMNS,
    params.userId,
    params.projectId,
  );
  const ownedAliasedEvent = ownedEventCondition(
    ALIASED_EVENT_COLUMNS,
    params.userId,
    params.projectId,
  );

  return {
    ownedProject: Prisma.sql`"userId" = ${params.userId}`,
    ownedEvent,
    ownedAliasedEvent,
    currentEvent: scopedEventCondition(
      ownedEvent,
      EVENT_COLUMNS.createdAt,
      params.range,
    ),
    currentAliasedEvent: scopedEventCondition(
      ownedAliasedEvent,
      ALIASED_EVENT_COLUMNS.createdAt,
      params.range,
    ),
    todayEvent: Prisma.sql`${ownedEvent}
      AND ${EVENT_COLUMNS.createdAt} >= CURRENT_DATE`,
    comparisonCurrentRange: periodCondition(
      EVENT_COLUMNS.createdAt,
      params.comparisonCurrent,
    ),
    comparisonPreviousRange: periodCondition(
      EVENT_COLUMNS.createdAt,
      params.comparisonPrevious,
    ),
  };
}

export function createAnalyticsScope(
  input: CreateAnalyticsScopeInput,
): AnalyticsScopeResult {
  const projectId =
    typeof input.projectId === "string" && input.projectId
      ? input.projectId
      : null;
  const isCustom = input.range === "custom";
  const customResult = isCustom
    ? parseCustomDateRange(input.from, input.to, input.now)
    : null;

  if (customResult && !customResult.valid) {
    return customResult;
  }

  const custom = customResult?.valid ? customResult.value : null;
  const token = resolveRangeToken(input.range);
  const interval = rangeToInterval(token);
  const rangePeriod: AnalyticsPeriod = custom
    ? {
        startInclusive: calendarBoundary(custom.from),
        endExclusive: calendarBoundary(custom.endExclusive),
      }
    : {
        startInclusive: interval ? relativeBoundary(interval) : null,
        endExclusive: null,
      };
  const comparisonWindow = COMPARISON_WINDOWS[token];
  const comparisonCurrent: AnalyticsPeriod = custom
    ? rangePeriod
    : {
        startInclusive: relativeBoundary(comparisonWindow.current),
        endExclusive: null,
      };
  const comparisonPrevious: AnalyticsPeriod = custom
    ? {
        startInclusive: calendarBoundary(custom.previousFrom),
        endExclusive: calendarBoundary(custom.from),
      }
    : {
        startInclusive: relativeBoundary(comparisonWindow.previous),
        endExclusive: relativeBoundary(comparisonWindow.current),
      };
  const dayCount = custom
    ? custom.dayCount
    : token === "all"
      ? null
      : PRESET_DAY_COUNTS[token];
  const comparisonLabel = custom
    ? `previous ${custom.dayCount} ${custom.dayCount === 1 ? "day" : "days"}`
    : comparisonWindow.label;

  return {
    valid: true,
    value: {
      userId: input.userId,
      projectId,
      timezone: "database-session",
      range: custom
        ? {
            key: "custom",
            period: rangePeriod,
            custom,
            dayCount: custom.dayCount,
            includesToday: custom.includesToday,
            isAllTime: false,
            isCustom: true,
          }
        : {
            key: token,
            period: rangePeriod,
            custom: null,
            dayCount,
            includesToday: true,
            isAllTime: token === "all",
            isCustom: false,
          },
      comparison: {
        currentRange: comparisonCurrent,
        previousRange: comparisonPrevious,
        label: comparisonLabel,
      },
      checkTodayActivity: custom ? custom.includesToday : token !== "all",
      sql: buildSqlScope({
        userId: input.userId,
        projectId,
        range: rangePeriod,
        comparisonCurrent,
        comparisonPrevious,
      }),
    },
  };
}
