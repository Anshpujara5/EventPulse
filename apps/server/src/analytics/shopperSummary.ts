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
  // COUNT(DISTINCT col) skips NULLs, so rows ingested before
  // customerId/sessionId existed simply don't count — no ipAddress/userAgent
  // identity guessing.
  const [row] = await prisma.$queryRaw<ShopperSummaryRow[]>`
    SELECT
      COUNT(DISTINCT "customerId") AS "uniqueCustomers",
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
