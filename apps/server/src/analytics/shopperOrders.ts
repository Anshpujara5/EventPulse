import { prisma } from "../config/prisma";
import type { AnalyticsScope } from "./analyticsScope";
import { percentOrNull, roundPct, toCount } from "./shared/numbers";
import { orderFactsCtes } from "./shared/orderFacts";

const ORDER_ID_UNLOCK_GUIDANCE =
  "Add order_id to purchase_completed to unlock exact order counts.";

interface ShopperOrdersRow {
  purchaseEvents: bigint;
  confirmedOrdersInScope: bigint;
  unattributedOrders: bigint;
  buyers: bigint;
  repeatBuyers: bigint;
  totalAttributedOrders: unknown;
  dominantCurrency: string | null;
  ordersExcludedForCurrency: unknown;
  projectId: string | null;
  projectName: string | null;
  customerId: string | null;
  confirmedOrders: bigint | null;
  sessions: bigint | null;
  gmv: unknown;
}

// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export type RepeatPurchase =
  | {
      status: "available";
      buyers: number;
      repeatBuyers: number;
      repeatRatePercent: number | null;
      averageOrdersPerBuyer: number | null;
    }
  | {
      status: "unavailable";
      missingFields: string[];
      message: string;
    };

export interface TopShopperRow {
  projectId: string;
  projectName: string;
  customerId: string;
  confirmedOrders: number;
  sessions: number;
  gmv: number | null;
}

export type TopShoppers =
  | {
      status: "available";
      currency: string | null;
      rows: TopShopperRow[];
      ordersExcludedForCurrency: number;
      unattributedOrders: number;
    }
  | {
      status: "unavailable";
      missingFields: string[];
      message: string;
    };

export interface ShopperOrdersResult {
  repeatPurchase: RepeatPurchase;
  topShoppers: TopShoppers;
}

/**
 * B3 Repeat Purchase Rate and B4 Top Shoppers.
 *
 * Confirmed orders come only from the shared order-facts chain. Shopper
 * attribution comes from each order's identity representative; GMV uses that
 * same shopper identity and the dominant-currency money representative.
 */
export async function fetchShopperOrders(
  scope: AnalyticsScope,
): Promise<ShopperOrdersResult> {
  const rows = await prisma.$queryRaw<ShopperOrdersRow[]>`
    WITH
    ${orderFactsCtes(scope.sql.currentEvent)},
    order_quality_summary AS (
      SELECT
        (SELECT COUNT(*) FROM order_fact_events) AS purchase_events,
        (SELECT COUNT(*) FROM identity_representatives)
          AS confirmed_orders_in_scope,
        (
          SELECT COUNT(*)
          FROM identity_representatives
          WHERE NULLIF(BTRIM("customerId"), '') IS NULL
        ) AS unattributed_orders
    ),
    orders_per_customer AS (
      SELECT
        i."projectId",
        p.name AS project_name,
        NULLIF(BTRIM(i."customerId"), '') AS customer_id,
        COUNT(*) AS confirmed_orders,
        COUNT(DISTINCT NULLIF(BTRIM(i."sessionId"), '')) AS sessions
      FROM identity_representatives i
      INNER JOIN "Project" p ON p.id = i."projectId"
      WHERE NULLIF(BTRIM(i."customerId"), '') IS NOT NULL
      GROUP BY
        i."projectId",
        p.name,
        NULLIF(BTRIM(i."customerId"), '')
    ),
    dominant_currency AS (
      SELECT currency, money_bearing_orders
      FROM currency_slices
      ORDER BY money_bearing_orders DESC, currency ASC
      LIMIT 1
    ),
    gmv_per_customer AS (
      SELECT
        i."projectId",
        NULLIF(BTRIM(i."customerId"), '') AS customer_id,
        SUM(m.amount_value) AS gmv
      FROM money_representatives m
      INNER JOIN identity_representatives i
        ON i."projectId" = m."projectId"
       AND i.order_id = m.order_id
      CROSS JOIN dominant_currency d
      WHERE m.normalized_currency = d.currency
        AND NULLIF(BTRIM(i."customerId"), '') IS NOT NULL
      GROUP BY
        i."projectId",
        NULLIF(BTRIM(i."customerId"), '')
    ),
    buyer_metrics AS (
      SELECT
        o.*,
        g.gmv,
        COUNT(*) OVER () AS buyers,
        COUNT(*) FILTER (
          WHERE o.confirmed_orders >= 2
        ) OVER () AS repeat_buyers,
        SUM(o.confirmed_orders) OVER () AS total_attributed_orders
      FROM orders_per_customer o
      LEFT JOIN gmv_per_customer g
        ON g."projectId" = o."projectId"
       AND g.customer_id = o.customer_id
    ),
    buyer_totals AS (
      SELECT
        COALESCE(MAX(buyers), 0) AS buyers,
        COALESCE(MAX(repeat_buyers), 0) AS repeat_buyers,
        COALESCE(MAX(total_attributed_orders), 0) AS total_attributed_orders
      FROM buyer_metrics
    ),
    top_shoppers AS (
      SELECT *
      FROM buyer_metrics
      ORDER BY
        confirmed_orders DESC,
        sessions DESC,
        customer_id ASC,
        "projectId" ASC
      LIMIT 10
    ),
    money_metadata AS (
      SELECT
        d.currency AS dominant_currency,
        COALESCE((SELECT SUM(money_bearing_orders) FROM currency_slices), 0)
          - COALESCE(d.money_bearing_orders, 0)
          AS orders_excluded_for_currency
      FROM (SELECT 1) seed
      LEFT JOIN dominant_currency d ON TRUE
    )
    SELECT
      q.purchase_events AS "purchaseEvents",
      q.confirmed_orders_in_scope AS "confirmedOrdersInScope",
      q.unattributed_orders AS "unattributedOrders",
      totals.buyers,
      totals.repeat_buyers AS "repeatBuyers",
      totals.total_attributed_orders AS "totalAttributedOrders",
      money.dominant_currency AS "dominantCurrency",
      money.orders_excluded_for_currency AS "ordersExcludedForCurrency",
      top."projectId",
      top.project_name AS "projectName",
      top.customer_id AS "customerId",
      top.confirmed_orders AS "confirmedOrders",
      top.sessions,
      top.gmv
    FROM order_quality_summary q
    CROSS JOIN buyer_totals totals
    CROSS JOIN money_metadata money
    LEFT JOIN top_shoppers top ON TRUE
    ORDER BY
      top.confirmed_orders DESC NULLS LAST,
      top.sessions DESC NULLS LAST,
      top.customer_id ASC NULLS LAST,
      top."projectId" ASC NULLS LAST
  `;

  const first = rows[0];
  const purchaseEvents = toCount(first?.purchaseEvents);
  const confirmedOrdersInScope = toCount(first?.confirmedOrdersInScope);
  const unavailable = purchaseEvents > 0 && confirmedOrdersInScope === 0;

  if (unavailable) {
    const state = {
      status: "unavailable" as const,
      missingFields: ["order_id"],
      message: ORDER_ID_UNLOCK_GUIDANCE,
    };

    return {
      repeatPurchase: state,
      topShoppers: state,
    };
  }

  const buyers = toCount(first?.buyers);
  const repeatBuyers = toCount(first?.repeatBuyers);
  const totalAttributedOrders = Number(first?.totalAttributedOrders ?? 0);
  const rowsForDisplay = rows.flatMap<TopShopperRow>((row) => {
    if (
      row.projectId === null ||
      row.projectName === null ||
      row.customerId === null
    ) {
      return [];
    }

    return [
      {
        projectId: row.projectId,
        projectName: row.projectName,
        customerId: row.customerId,
        confirmedOrders: toCount(row.confirmedOrders),
        sessions: toCount(row.sessions),
        gmv: row.gmv === null ? null : Number(row.gmv),
      },
    ];
  });

  return {
    repeatPurchase: {
      status: "available",
      buyers,
      repeatBuyers,
      repeatRatePercent: percentOrNull(repeatBuyers, buyers),
      averageOrdersPerBuyer:
        buyers > 0 ? roundPct(totalAttributedOrders / buyers) : null,
    },
    topShoppers: {
      status: "available",
      currency: first?.dominantCurrency ?? null,
      rows: rowsForDisplay,
      ordersExcludedForCurrency: Number(
        first?.ordersExcludedForCurrency ?? 0,
      ),
      unattributedOrders: toCount(first?.unattributedOrders),
    },
  };
}
