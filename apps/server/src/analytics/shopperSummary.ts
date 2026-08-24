import { Prisma } from "@prisma/client";
import type { AnalyticsScope } from "./analyticsScope";
import { PURCHASE_ALIASES } from "./shared/aliases";
import { toCount } from "./shared/numbers";
import { prisma } from "../config/prisma";

interface ShopperSummaryRow {
  uniqueCustomers: bigint;
  uniqueSessions: bigint;
  purchasingSessions: bigint;
}

export interface ShopperSummary {
  uniqueCustomers: number;
  uniqueSessions: number;
  purchasingSessions: number;
}

export async function fetchShopperSummary(
  scope: AnalyticsScope,
): Promise<ShopperSummary> {
  // Blueprint Principle 5 / P3-P5: shopper identity is project-scoped. The
  // FILTER preserves the legacy null exclusion without guessing identity.
  const [row] = await prisma.$queryRaw<ShopperSummaryRow[]>`
    SELECT
      COUNT(DISTINCT ("projectId", "customerId")) FILTER (
        WHERE "customerId" IS NOT NULL
      ) AS "uniqueCustomers",
      COUNT(DISTINCT "sessionId") AS "uniqueSessions",
      COUNT(DISTINCT "sessionId") FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...PURCHASE_ALIASES])})
      ) AS "purchasingSessions"
    FROM "Event"
    WHERE ${scope.sql.currentEvent}
  `;

  return {
    uniqueCustomers: toCount(row?.uniqueCustomers),
    uniqueSessions: toCount(row?.uniqueSessions),
    purchasingSessions: toCount(row?.purchasingSessions),
  };
}
