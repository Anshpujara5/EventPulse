import type { AnalyticsScope } from "./analyticsScope";
import { roundPct, toCount } from "./shared/numbers";
import { prisma } from "../config/prisma";

interface PeriodComparisonRow {
  current: bigint;
  previous: bigint;
}

export interface PeriodComparisonCounts {
  current: number;
  previous: number;
}

export type ComparisonDirection = "up" | "down" | "flat" | "new" | "no_data";

export interface PeriodComparison {
  currentPeriodEvents: number;
  previousPeriodEvents: number;
  changePercent: number | null;
  direction: ComparisonDirection;
  label: string;
}

const FLAT_CHANGE_THRESHOLD_PCT = 5;

export async function fetchPeriodComparison(
  scope: AnalyticsScope,
): Promise<PeriodComparisonCounts> {
  const [row] = await prisma.$queryRaw<PeriodComparisonRow[]>`
    SELECT
      COUNT(*) FILTER (WHERE ${scope.sql.comparisonCurrentRange}) AS current,
      COUNT(*) FILTER (WHERE ${scope.sql.comparisonPreviousRange}) AS previous
    FROM "Event"
    WHERE ${scope.sql.ownedEvent}
  `;

  return {
    current: toCount(row?.current),
    previous: toCount(row?.previous),
  };
}

export function buildComparison(
  periodComparison: PeriodComparisonCounts,
  comparisonPeriodLabel: string,
): PeriodComparison {
  const currentPeriodEvents = periodComparison.current;
  const previousPeriodEvents = periodComparison.previous;

  let changePercent: number | null = null;
  let direction: ComparisonDirection;

  if (currentPeriodEvents === 0 && previousPeriodEvents === 0) {
    direction = "no_data";
  } else if (previousPeriodEvents === 0) {
    direction = "new";
  } else {
    const pct =
      ((currentPeriodEvents - previousPeriodEvents) / previousPeriodEvents) * 100;
    changePercent = roundPct(pct);
    direction =
      Math.abs(pct) < FLAT_CHANGE_THRESHOLD_PCT ? "flat" : pct > 0 ? "up" : "down";
  }

  return {
    currentPeriodEvents,
    previousPeriodEvents,
    changePercent,
    direction,
    label: `Compared with ${comparisonPeriodLabel}`,
  };
}
