import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { NON_NEGATIVE_MONEY_SQL_PATTERN } from "../contract/moneyRules";
import {
  ORDER_COUNT_BASIS,
  SESSION_ORDER_FALLBACK_LABEL,
  type OrderCountBasis,
} from "../contract/orderIdentity";
import type { AnalyticsScope } from "./analyticsScope";
import { roundPct } from "./shared/numbers";
import {
  CURRENCY_SQL_PATTERN,
  allMoneyEvidenceNamesSql,
  orderFactNamesSql,
  orderFactsCtes,
} from "./shared/orderFacts";
import {
  fetchTrendSpanDays,
  resolveTrendGranularity,
  type TrendGranularity,
} from "./trend";

const PAYMENT_COMPLETED_EVENT_NAME = "payment_completed";
const SALES_FLAT_CHANGE_THRESHOLD_PCT = 5;
const GMV_INSIGHT_THRESHOLD_PCT = 25;
const GMV_INSIGHT_MIN_ORDERS = 10;

export interface OrderIdentityRepresentative {
  projectId: string;
  orderId: string;
  eventId: string;
  eventName: string;
  createdAt: Date;
}

/** Phase 2D will materialize this rule without changing order identity. */
export interface OrderItemsRepresentative extends OrderIdentityRepresentative {
  items: unknown[];
}

export type ConfirmedOrdersMeasurement = {
  status: "confirmed";
  basis: typeof ORDER_COUNT_BASIS.exact;
  value: number;
  label: "Confirmed orders";
  isEstimated: false;
  unlockGuidance: null;
};

export type EstimatedOrdersMeasurement = {
  status: "estimated";
  basis: typeof ORDER_COUNT_BASIS.sessionEstimate;
  value: number;
  label: typeof SESSION_ORDER_FALLBACK_LABEL;
  isEstimated: true;
  unlockGuidance: string;
};

export type UnavailableOrdersMeasurement = {
  status: "unavailable";
  basis: null;
  value: null;
  label: "Orders unavailable";
  isEstimated: false;
  unlockGuidance: string;
};

export type SalesOrdersMeasurement =
  | ConfirmedOrdersMeasurement
  | EstimatedOrdersMeasurement
  | UnavailableOrdersMeasurement;

export interface SalesCurrencySlice {
  currency: string;
  gmv: number;
  moneyBearingOrders: number;
  aov: number;
  orderSharePercent: number;
}

export type AvailableSalesMoney = {
  status: "available";
  dominantCurrency: string;
  headlineGmv: number;
  headlineAov: number;
  aovBasisNote: string;
  currencies: SalesCurrencySlice[];
  otherCurrencyOrders: number;
  otherCurrencyCount: number;
  unlockGuidance: null;
};

export type UnavailableSalesMoney = {
  status: "unavailable";
  dominantCurrency: null;
  headlineGmv: null;
  headlineAov: null;
  aovBasisNote: null;
  currencies: [];
  otherCurrencyOrders: 0;
  otherCurrencyCount: 0;
  unlockGuidance: string;
};

export type SalesMoneyMeasurement = AvailableSalesMoney | UnavailableSalesMoney;

export interface SalesTrendPoint {
  date: string;
  orders: number;
  gmv: number | null;
}

export interface SalesTrend {
  granularity: TrendGranularity;
  orderBasis: OrderCountBasis;
  gmvCurrency: string | null;
  points: SalesTrendPoint[];
}

export type SalesComparisonDirection =
  | "up"
  | "down"
  | "flat"
  | "new"
  | "no_data";

export interface SalesMetricComparison {
  current: number;
  previous: number | null;
  changePercent: number | null;
  direction: SalesComparisonDirection;
  label: string;
}

export interface SalesOrdersComparison extends SalesMetricComparison {
  basis: OrderCountBasis;
}

export interface SalesMoneyComparison extends SalesMetricComparison {
  currency: string;
  currentMoneyBearingOrders: number;
  previousMoneyBearingOrders: number;
}

export interface SalesComparison {
  orders: SalesOrdersComparison | null;
  gmv: SalesMoneyComparison | null;
  aov: SalesMoneyComparison | null;
}

export interface SalesInsight {
  id: "gmv-change";
  severity: "info" | "warning";
  title: string;
  description: string;
  changePercent: number;
  currency: string;
}

export interface SalesDataQuality {
  purchaseEvents: number;
  purchaseEventsWithOrderId: number;
  purchaseEventsWithOrderIdPercent: number | null;
  paymentOnlyOrderIds: number;
  missingOrderIdPurchaseEvents: number;
  ordersWithoutMoney: number;
  missingAmountOrders: number;
  invalidAmountOrders: number;
  negativeAmountOrders: number;
  missingCurrencyOrders: number;
  invalidCurrencyOrders: number;
  conflictingMoneyEvidence: number;
}

// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export interface SalesTabData {
  orders: SalesOrdersMeasurement;
  money: SalesMoneyMeasurement;
  trend: SalesTrend | null;
  comparison: SalesComparison;
  insights: SalesInsight[];
  dataQuality: SalesDataQuality;
}

export type OverviewOrdersKpi = SalesOrdersMeasurement & {
  comparison: SalesOrdersComparison | null;
};

export type OverviewGmvKpi =
  | {
      status: "available";
      value: number;
      currency: string;
      otherCurrencyOrders: number;
      otherCurrencyCount: number;
      comparison: SalesMoneyComparison | null;
      unlockGuidance: null;
    }
  | {
      status: "unavailable";
      value: null;
      currency: null;
      otherCurrencyOrders: 0;
      otherCurrencyCount: 0;
      comparison: null;
      unlockGuidance: string;
    };

export type OverviewAovKpi =
  | {
      status: "available";
      value: number;
      currency: string;
      basisNote: string;
      comparison: SalesMoneyComparison | null;
      unlockGuidance: null;
    }
  | {
      status: "unavailable";
      value: null;
      currency: null;
      basisNote: null;
      comparison: null;
      unlockGuidance: string;
    };

export interface OverviewSalesKpis {
  orders: OverviewOrdersKpi;
  gmv: OverviewGmvKpi;
  aov: OverviewAovKpi;
}

interface HeadlineRow {
  confirmedOrders: bigint;
  purchasingSessions: bigint;
  purchaseEvents: bigint;
  purchaseEventsWithOrderId: bigint;
  ownedHasOrderIdentity: boolean;
  paymentOnlyOrderIds: bigint;
  missingOrderIdPurchaseEvents: bigint;
  ordersWithoutMoney: bigint;
  missingAmountOrders: bigint;
  invalidAmountOrders: bigint;
  negativeAmountOrders: bigint;
  missingCurrencyOrders: bigint;
  invalidCurrencyOrders: bigint;
  conflictingMoneyEvidence: bigint;
  currency: string | null;
  gmv: unknown;
  moneyBearingOrders: bigint | null;
}

interface ComparisonRow {
  period: "current" | "previous";
  confirmedOrders: bigint;
  purchasingSessions: bigint;
  purchaseEvents: bigint;
  currency: string | null;
  gmv: unknown;
  moneyBearingOrders: bigint | null;
}

interface OverviewSalesRow {
  period: "headline" | "current" | "previous";
  confirmedOrders: bigint;
  purchasingSessions: bigint;
  purchaseEvents: bigint;
  ownedHasOrderIdentity: boolean;
  currency: string | null;
  gmv: unknown;
  moneyBearingOrders: bigint | null;
}

interface TrendRow {
  bucket: string;
  orders: bigint;
  gmv: unknown;
}

interface SalesPeriodSnapshot {
  orders: SalesOrdersMeasurement;
  currencies: SalesCurrencySlice[];
}

interface SalesHeadlineResult extends SalesPeriodSnapshot {
  money: SalesMoneyMeasurement;
  dataQuality: SalesDataQuality;
  ownedHasOrderIdentity: boolean;
}

function numberFromDatabase(value: unknown): number {
  return Number(value ?? 0);
}

function countFromDatabase(value: bigint | null | undefined): number {
  return Number(value ?? 0n);
}

function buildOrdersMeasurement(input: {
  confirmedOrders: number;
  purchasingSessions: number;
  purchaseEvents: number;
  ownedHasOrderIdentity: boolean;
}): SalesOrdersMeasurement {
  if (input.confirmedOrders > 0) {
    return {
      status: "confirmed",
      basis: ORDER_COUNT_BASIS.exact,
      value: input.confirmedOrders,
      label: "Confirmed orders",
      isEstimated: false,
      unlockGuidance: null,
    };
  }

  if (input.purchaseEvents > 0 && input.purchasingSessions > 0) {
    return {
      status: "estimated",
      basis: ORDER_COUNT_BASIS.sessionEstimate,
      value: input.purchasingSessions,
      label: SESSION_ORDER_FALLBACK_LABEL,
      isEstimated: true,
      unlockGuidance:
        "Add order_id to purchase events to unlock confirmed Orders, GMV, and AOV.",
    };
  }

  if (input.purchaseEvents === 0 && input.ownedHasOrderIdentity) {
    return {
      status: "confirmed",
      basis: ORDER_COUNT_BASIS.exact,
      value: 0,
      label: "Confirmed orders",
      isEstimated: false,
      unlockGuidance: null,
    };
  }

  return {
    status: "unavailable",
    basis: null,
    value: null,
    label: "Orders unavailable",
    isEstimated: false,
    unlockGuidance:
      input.purchaseEvents > 0
        ? "Add order_id to purchase events to unlock confirmed Orders, GMV, and AOV."
        : "Send purchase_completed with order_id to unlock confirmed Orders.",
  };
}

function buildCurrencySlices(rows: Array<{
  currency: string | null;
  gmv: unknown;
  moneyBearingOrders: bigint | null;
}>): SalesCurrencySlice[] {
  const totalMoneyBearingOrders = rows.reduce(
    (sum, row) => sum + countFromDatabase(row.moneyBearingOrders),
    0,
  );

  return rows
    .filter((row): row is typeof row & { currency: string } => row.currency !== null)
    .map((row) => {
      const moneyBearingOrders = countFromDatabase(row.moneyBearingOrders);
      const gmv = numberFromDatabase(row.gmv);

      return {
        currency: row.currency,
        gmv,
        moneyBearingOrders,
        aov: moneyBearingOrders > 0 ? gmv / moneyBearingOrders : 0,
        orderSharePercent:
          totalMoneyBearingOrders > 0
            ? roundPct((moneyBearingOrders / totalMoneyBearingOrders) * 100)
            : 0,
      };
    })
    .sort(
      (left, right) =>
        right.moneyBearingOrders - left.moneyBearingOrders ||
        left.currency.localeCompare(right.currency),
    );
}

function buildMoneyMeasurement(
  orders: SalesOrdersMeasurement,
  currencies: SalesCurrencySlice[],
): SalesMoneyMeasurement {
  if (orders.status !== "confirmed") {
    return {
      status: "unavailable",
      dominantCurrency: null,
      headlineGmv: null,
      headlineAov: null,
      aovBasisNote: null,
      currencies: [],
      otherCurrencyOrders: 0,
      otherCurrencyCount: 0,
      unlockGuidance:
        orders.status === "estimated"
          ? "Add order_id to purchase events to unlock GMV and AOV."
          : "Send purchase_completed with order_id, amount, and currency to unlock GMV and AOV.",
    };
  }

  const dominant = currencies[0];
  if (!dominant) {
    return {
      status: "unavailable",
      dominantCurrency: null,
      headlineGmv: null,
      headlineAov: null,
      aovBasisNote: null,
      currencies: [],
      otherCurrencyOrders: 0,
      otherCurrencyCount: 0,
      unlockGuidance:
        orders.value === 0
          ? "No money-bearing confirmed orders were observed in this range."
          : "Add a non-negative amount and uppercase currency to confirmed purchase events to unlock GMV and AOV.",
    };
  }

  const totalMoneyBearingOrders = currencies.reduce(
    (sum, currency) => sum + currency.moneyBearingOrders,
    0,
  );

  return {
    status: "available",
    dominantCurrency: dominant.currency,
    headlineGmv: dominant.gmv,
    headlineAov: dominant.aov,
    aovBasisNote: `across the ${dominant.moneyBearingOrders} orders with parseable amounts`,
    currencies,
    otherCurrencyOrders: totalMoneyBearingOrders - dominant.moneyBearingOrders,
    otherCurrencyCount: Math.max(0, currencies.length - 1),
    unlockGuidance: null,
  };
}

export async function fetchSalesHeadline(
  scope: AnalyticsScope,
): Promise<SalesHeadlineResult> {
  const rows = await prisma.$queryRaw<HeadlineRow[]>`
    WITH
    ${orderFactsCtes(scope.sql.currentEvent)},
    owned_identity_capability AS (
      SELECT EXISTS (
        SELECT 1
        FROM "Event"
        WHERE ${scope.sql.ownedEvent}
          AND LOWER(name) IN (${orderFactNamesSql()})
          AND NULLIF(BTRIM(properties->>'order_id'), '') IS NOT NULL
      ) AS has_identity
    ),
    payment_only_order_ids AS (
      SELECT DISTINCT e."projectId", e.order_id
      FROM scoped_sales_events e
      WHERE LOWER(e.name) = ${PAYMENT_COMPLETED_EVENT_NAME}
        AND e.order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM identity_representatives i
          WHERE i."projectId" = e."projectId" AND i.order_id = e.order_id
        )
    ),
    aggregate_counts AS (
      SELECT
        (SELECT COUNT(*) FROM identity_representatives) AS confirmed_orders,
        (SELECT COUNT(*) FROM session_representatives) AS purchasing_sessions,
        (SELECT COUNT(*) FROM order_fact_events) AS purchase_events,
        (SELECT COUNT(*) FROM order_fact_events WHERE order_id IS NOT NULL)
          AS purchase_events_with_order_id,
        (SELECT has_identity FROM owned_identity_capability)
          AS owned_has_order_identity,
        (SELECT COUNT(*) FROM payment_only_order_ids) AS payment_only_order_ids,
        (SELECT COUNT(*) FROM order_fact_events WHERE order_id IS NULL)
          AS missing_order_id_purchase_events,
        (SELECT COUNT(*) FROM order_quality WHERE money_representative_id IS NULL)
          AS orders_without_money,
        (SELECT COUNT(*) FROM order_quality WHERE NOT COALESCE(has_amount, FALSE))
          AS missing_amount_orders,
        (SELECT COUNT(*) FROM order_quality WHERE COALESCE(has_invalid_amount, FALSE))
          AS invalid_amount_orders,
        (SELECT COUNT(*) FROM order_quality WHERE COALESCE(has_negative_amount, FALSE))
          AS negative_amount_orders,
        (SELECT COUNT(*) FROM order_quality WHERE COALESCE(has_missing_currency, FALSE))
          AS missing_currency_orders,
        (SELECT COUNT(*) FROM order_quality WHERE COALESCE(has_invalid_currency, FALSE))
          AS invalid_currency_orders,
        (SELECT COUNT(*) FROM order_quality WHERE COALESCE(has_conflicting_money, FALSE))
          AS conflicting_money_evidence
    )
    SELECT
      a.confirmed_orders AS "confirmedOrders",
      a.purchasing_sessions AS "purchasingSessions",
      a.purchase_events AS "purchaseEvents",
      a.purchase_events_with_order_id AS "purchaseEventsWithOrderId",
      a.owned_has_order_identity AS "ownedHasOrderIdentity",
      a.payment_only_order_ids AS "paymentOnlyOrderIds",
      a.missing_order_id_purchase_events AS "missingOrderIdPurchaseEvents",
      a.orders_without_money AS "ordersWithoutMoney",
      a.missing_amount_orders AS "missingAmountOrders",
      a.invalid_amount_orders AS "invalidAmountOrders",
      a.negative_amount_orders AS "negativeAmountOrders",
      a.missing_currency_orders AS "missingCurrencyOrders",
      a.invalid_currency_orders AS "invalidCurrencyOrders",
      a.conflicting_money_evidence AS "conflictingMoneyEvidence",
      c.currency,
      c.gmv,
      c.money_bearing_orders AS "moneyBearingOrders"
    FROM aggregate_counts a
    LEFT JOIN currency_slices c ON TRUE
    ORDER BY c.money_bearing_orders DESC NULLS LAST, c.currency ASC
  `;

  const first = rows[0];
  const confirmedOrders = countFromDatabase(first?.confirmedOrders);
  const purchasingSessions = countFromDatabase(first?.purchasingSessions);
  const purchaseEvents = countFromDatabase(first?.purchaseEvents);
  const ownedHasOrderIdentity = first?.ownedHasOrderIdentity === true;
  const orders = buildOrdersMeasurement({
    confirmedOrders,
    purchasingSessions,
    purchaseEvents,
    ownedHasOrderIdentity,
  });
  const currencies = buildCurrencySlices(rows);
  const purchaseEventsWithOrderId = countFromDatabase(
    first?.purchaseEventsWithOrderId,
  );

  return {
    orders,
    currencies,
    money: buildMoneyMeasurement(orders, currencies),
    ownedHasOrderIdentity,
    dataQuality: {
      purchaseEvents,
      purchaseEventsWithOrderId,
      purchaseEventsWithOrderIdPercent:
        purchaseEvents > 0
          ? roundPct((purchaseEventsWithOrderId / purchaseEvents) * 100)
          : null,
      paymentOnlyOrderIds: countFromDatabase(first?.paymentOnlyOrderIds),
      missingOrderIdPurchaseEvents: countFromDatabase(
        first?.missingOrderIdPurchaseEvents,
      ),
      ordersWithoutMoney: countFromDatabase(first?.ordersWithoutMoney),
      missingAmountOrders: countFromDatabase(first?.missingAmountOrders),
      invalidAmountOrders: countFromDatabase(first?.invalidAmountOrders),
      negativeAmountOrders: countFromDatabase(first?.negativeAmountOrders),
      missingCurrencyOrders: countFromDatabase(first?.missingCurrencyOrders),
      invalidCurrencyOrders: countFromDatabase(first?.invalidCurrencyOrders),
      conflictingMoneyEvidence: countFromDatabase(
        first?.conflictingMoneyEvidence,
      ),
    },
  };
}

export async function fetchSalesComparisonRows(
  scope: AnalyticsScope,
): Promise<ComparisonRow[]> {
  return prisma.$queryRaw<ComparisonRow[]>`
    WITH comparison_events AS (
      SELECT
        id,
        name,
        properties,
        "projectId",
        "sessionId",
        "createdAt",
        NULLIF(BTRIM(properties->>'order_id'), '') AS order_id,
        properties->>'amount' AS amount_text,
        properties->>'currency' AS currency_text,
        CASE
          WHEN ${scope.sql.comparisonCurrentRange} THEN 'current'
          WHEN ${scope.sql.comparisonPreviousRange} THEN 'previous'
        END AS period
      FROM "Event"
      WHERE ${scope.sql.ownedEvent}
        AND (
          ${scope.sql.comparisonCurrentRange}
          OR ${scope.sql.comparisonPreviousRange}
        )
        AND LOWER(name) IN (${allMoneyEvidenceNamesSql()})
    ),
    order_facts AS (
      SELECT *
      FROM comparison_events
      WHERE LOWER(name) IN (${orderFactNamesSql()})
    ),
    identity_ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY period, "projectId", order_id
          ORDER BY "createdAt" ASC, id ASC
        ) AS identity_rank
      FROM order_facts
      WHERE order_id IS NOT NULL
    ),
    identities AS (
      SELECT * FROM identity_ranked WHERE identity_rank = 1
    ),
    session_ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY period, "projectId", NULLIF(BTRIM("sessionId"), '')
          ORDER BY "createdAt" ASC, id ASC
        ) AS session_rank
      FROM order_facts
      WHERE NULLIF(BTRIM("sessionId"), '') IS NOT NULL
    ),
    sessions AS (
      SELECT * FROM session_ranked WHERE session_rank = 1
    ),
    money_evidence AS (
      SELECT e.*
      FROM comparison_events e
      INNER JOIN identities i
        ON i.period = e.period
       AND i."projectId" = e."projectId"
       AND i.order_id = e.order_id
      WHERE e.amount_text ~ ${NON_NEGATIVE_MONEY_SQL_PATTERN}
        AND BTRIM(e.currency_text) ~ ${CURRENCY_SQL_PATTERN}
    ),
    money_ranked AS (
      SELECT
        *,
        amount_text::numeric AS amount_value,
        BTRIM(currency_text) AS normalized_currency,
        ROW_NUMBER() OVER (
          PARTITION BY period, "projectId", order_id
          ORDER BY
            CASE WHEN LOWER(name) IN (${orderFactNamesSql()}) THEN 0 ELSE 1 END,
            "createdAt" ASC,
            id ASC
        ) AS money_rank
      FROM money_evidence
    ),
    money_representatives AS (
      SELECT * FROM money_ranked WHERE money_rank = 1
    ),
    periods(period) AS (VALUES ('current'), ('previous')),
    period_counts AS (
      SELECT
        p.period,
        (SELECT COUNT(*) FROM identities i WHERE i.period = p.period)
          AS confirmed_orders,
        (SELECT COUNT(*) FROM sessions s WHERE s.period = p.period)
          AS purchasing_sessions,
        (SELECT COUNT(*) FROM order_facts f WHERE f.period = p.period)
          AS purchase_events
      FROM periods p
    ),
    currency_slices AS (
      SELECT
        period,
        normalized_currency AS currency,
        SUM(amount_value) AS gmv,
        COUNT(*) AS money_bearing_orders
      FROM money_representatives
      GROUP BY period, normalized_currency
    )
    SELECT
      p.period,
      p.confirmed_orders AS "confirmedOrders",
      p.purchasing_sessions AS "purchasingSessions",
      p.purchase_events AS "purchaseEvents",
      c.currency,
      c.gmv,
      c.money_bearing_orders AS "moneyBearingOrders"
    FROM period_counts p
    LEFT JOIN currency_slices c ON c.period = p.period
    ORDER BY p.period ASC, c.money_bearing_orders DESC NULLS LAST, c.currency ASC
  `;
}

export async function fetchOverviewSalesRows(
  scope: AnalyticsScope,
): Promise<OverviewSalesRow[]> {
  return prisma.$queryRaw<OverviewSalesRow[]>`
    WITH scoped_events AS (
      SELECT
        id,
        name,
        properties,
        "userId",
        "projectId",
        "sessionId",
        "createdAt",
        NULLIF(BTRIM(properties->>'order_id'), '') AS order_id,
        properties->>'amount' AS amount_text,
        properties->>'currency' AS currency_text
      FROM "Event"
      WHERE ${scope.sql.ownedEvent}
        AND (
          ${scope.sql.currentEvent}
          OR ${scope.sql.comparisonPreviousRange}
        )
        AND LOWER(name) IN (${allMoneyEvidenceNamesSql()})
    ),
    periodized_events AS (
      SELECT e.*, period_scope.period
      FROM scoped_events e
      CROSS JOIN LATERAL (
        VALUES
          ('headline', ${scope.sql.currentEvent}),
          ('current', ${scope.sql.comparisonCurrentRange}),
          ('previous', ${scope.sql.comparisonPreviousRange})
      ) AS period_scope(period, included)
      WHERE period_scope.included
    ),
    order_facts AS (
      SELECT *
      FROM periodized_events
      WHERE LOWER(name) IN (${orderFactNamesSql()})
    ),
    identity_ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY period, "projectId", order_id
          ORDER BY "createdAt" ASC, id ASC
        ) AS identity_rank
      FROM order_facts
      WHERE order_id IS NOT NULL
    ),
    identities AS (
      SELECT * FROM identity_ranked WHERE identity_rank = 1
    ),
    session_ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY period, "projectId", NULLIF(BTRIM("sessionId"), '')
          ORDER BY "createdAt" ASC, id ASC
        ) AS session_rank
      FROM order_facts
      WHERE NULLIF(BTRIM("sessionId"), '') IS NOT NULL
    ),
    sessions AS (
      SELECT * FROM session_ranked WHERE session_rank = 1
    ),
    money_evidence AS (
      SELECT e.*
      FROM periodized_events e
      INNER JOIN identities i
        ON i.period = e.period
       AND i."projectId" = e."projectId"
       AND i.order_id = e.order_id
      WHERE e.amount_text ~ ${NON_NEGATIVE_MONEY_SQL_PATTERN}
        AND BTRIM(e.currency_text) ~ ${CURRENCY_SQL_PATTERN}
    ),
    money_ranked AS (
      SELECT
        *,
        amount_text::numeric AS amount_value,
        BTRIM(currency_text) AS normalized_currency,
        ROW_NUMBER() OVER (
          PARTITION BY period, "projectId", order_id
          ORDER BY
            CASE WHEN LOWER(name) IN (${orderFactNamesSql()}) THEN 0 ELSE 1 END,
            "createdAt" ASC,
            id ASC
        ) AS money_rank
      FROM money_evidence
    ),
    money_representatives AS (
      SELECT * FROM money_ranked WHERE money_rank = 1
    ),
    owned_identity_capability AS (
      SELECT EXISTS (
        SELECT 1
        FROM "Event"
        WHERE ${scope.sql.ownedEvent}
          AND LOWER(name) IN (${orderFactNamesSql()})
          AND NULLIF(BTRIM(properties->>'order_id'), '') IS NOT NULL
      ) AS has_identity
    ),
    aggregate_counts AS (
      SELECT
        (SELECT COUNT(*) FILTER (WHERE period = 'headline') FROM identities)
          AS headline_confirmed_orders,
        (SELECT COUNT(*) FILTER (WHERE period = 'current') FROM identities)
          AS current_confirmed_orders,
        (SELECT COUNT(*) FILTER (WHERE period = 'previous') FROM identities)
          AS previous_confirmed_orders,
        (SELECT COUNT(*) FILTER (WHERE period = 'headline') FROM sessions)
          AS headline_purchasing_sessions,
        (SELECT COUNT(*) FILTER (WHERE period = 'current') FROM sessions)
          AS current_purchasing_sessions,
        (SELECT COUNT(*) FILTER (WHERE period = 'previous') FROM sessions)
          AS previous_purchasing_sessions,
        (SELECT COUNT(*) FILTER (WHERE period = 'headline') FROM order_facts)
          AS headline_purchase_events,
        (SELECT COUNT(*) FILTER (WHERE period = 'current') FROM order_facts)
          AS current_purchase_events,
        (SELECT COUNT(*) FILTER (WHERE period = 'previous') FROM order_facts)
          AS previous_purchase_events
    ),
    period_counts AS (
      SELECT
        'headline' AS period,
        headline_confirmed_orders AS confirmed_orders,
        headline_purchasing_sessions AS purchasing_sessions,
        headline_purchase_events AS purchase_events
      FROM aggregate_counts
      UNION ALL
      SELECT
        'current',
        current_confirmed_orders,
        current_purchasing_sessions,
        current_purchase_events
      FROM aggregate_counts
      UNION ALL
      SELECT
        'previous',
        previous_confirmed_orders,
        previous_purchasing_sessions,
        previous_purchase_events
      FROM aggregate_counts
    ),
    currency_slices AS (
      SELECT
        period,
        normalized_currency AS currency,
        SUM(amount_value) AS gmv,
        COUNT(*) AS money_bearing_orders
      FROM money_representatives
      GROUP BY period, normalized_currency
    )
    SELECT
      p.period,
      p.confirmed_orders AS "confirmedOrders",
      p.purchasing_sessions AS "purchasingSessions",
      p.purchase_events AS "purchaseEvents",
      (SELECT has_identity FROM owned_identity_capability)
        AS "ownedHasOrderIdentity",
      c.currency,
      c.gmv,
      c.money_bearing_orders AS "moneyBearingOrders"
    FROM period_counts p
    LEFT JOIN currency_slices c ON c.period = p.period
    ORDER BY p.period ASC, c.money_bearing_orders DESC NULLS LAST, c.currency ASC
  `;
}

function buildPeriodSnapshot(
  rows: Array<{
    period: string;
    confirmedOrders: bigint;
    purchasingSessions: bigint;
    purchaseEvents: bigint;
    currency: string | null;
    gmv: unknown;
    moneyBearingOrders: bigint | null;
  }>,
  period: string,
  ownedHasOrderIdentity: boolean,
): SalesPeriodSnapshot {
  const periodRows = rows.filter((row) => row.period === period);
  const first = periodRows[0];

  return {
    orders: buildOrdersMeasurement({
      confirmedOrders: countFromDatabase(first?.confirmedOrders),
      purchasingSessions: countFromDatabase(first?.purchasingSessions),
      purchaseEvents: countFromDatabase(first?.purchaseEvents),
      ownedHasOrderIdentity,
    }),
    currencies: buildCurrencySlices(periodRows),
  };
}

function buildMetricComparison(
  current: number,
  previous: number | null,
  label: string,
): SalesMetricComparison {
  if (previous === null) {
    return {
      current,
      previous: null,
      changePercent: null,
      direction: "no_data",
      label,
    };
  }

  if (current === 0 && previous === 0) {
    return {
      current,
      previous,
      changePercent: null,
      direction: "no_data",
      label,
    };
  }

  if (previous === 0) {
    return {
      current,
      previous,
      changePercent: null,
      direction: "new",
      label,
    };
  }

  const changePercent = roundPct(((current - previous) / previous) * 100);

  return {
    current,
    previous,
    changePercent,
    direction:
      Math.abs(changePercent) < SALES_FLAT_CHANGE_THRESHOLD_PCT
        ? "flat"
        : changePercent > 0
          ? "up"
          : "down",
    label,
  };
}

function buildSalesComparison(input: {
  current: SalesPeriodSnapshot;
  previous: SalesPeriodSnapshot;
  comparisonLabel: string;
}): SalesComparison {
  const label = `Compared with ${input.comparisonLabel}`;
  let orders: SalesOrdersComparison | null = null;

  if (
    input.current.orders.status !== "unavailable" &&
    input.previous.orders.status !== "unavailable" &&
    input.current.orders.basis === input.previous.orders.basis
  ) {
    orders = {
      ...buildMetricComparison(
        input.current.orders.value,
        input.previous.orders.value,
        label,
      ),
      basis: input.current.orders.basis,
    };
  }

  if (input.current.orders.status !== "confirmed") {
    return { orders, gmv: null, aov: null };
  }

  const currentCurrency = input.current.currencies[0];
  const dominantCurrency = currentCurrency?.currency;
  const previousCurrency = input.previous.currencies.find(
    (slice) => slice.currency === dominantCurrency,
  );

  if (!currentCurrency || !dominantCurrency) {
    return { orders, gmv: null, aov: null };
  }

  const comparisonBasis = {
    currency: dominantCurrency,
    currentMoneyBearingOrders: currentCurrency.moneyBearingOrders,
    previousMoneyBearingOrders: previousCurrency?.moneyBearingOrders ?? 0,
  };

  return {
    orders,
    gmv: {
      ...buildMetricComparison(
        currentCurrency.gmv,
        previousCurrency?.gmv ?? null,
        label,
      ),
      ...comparisonBasis,
    },
    aov: {
      ...buildMetricComparison(
        currentCurrency.aov,
        previousCurrency?.aov ?? null,
        label,
      ),
      ...comparisonBasis,
    },
  };
}

export async function buildOverviewSalesKpis(
  scope: AnalyticsScope,
): Promise<OverviewSalesKpis> {
  const rows = await fetchOverviewSalesRows(scope);
  const ownedHasOrderIdentity = rows[0]?.ownedHasOrderIdentity === true;
  const headline = buildPeriodSnapshot(
    rows,
    "headline",
    ownedHasOrderIdentity,
  );
  const current = buildPeriodSnapshot(
    rows,
    "current",
    ownedHasOrderIdentity,
  );
  const previous = buildPeriodSnapshot(
    rows,
    "previous",
    ownedHasOrderIdentity,
  );
  const comparison = buildSalesComparison({
    current,
    previous,
    comparisonLabel: scope.comparison.label,
  });
  const money = buildMoneyMeasurement(headline.orders, headline.currencies);
  const gmvComparison =
    money.status === "available" &&
    comparison.gmv?.currency === money.dominantCurrency
      ? comparison.gmv
      : null;
  const aovComparison =
    money.status === "available" &&
    comparison.aov?.currency === money.dominantCurrency
      ? comparison.aov
      : null;

  return {
    orders: {
      ...headline.orders,
      comparison: comparison.orders,
    },
    gmv:
      money.status === "available"
        ? {
            status: "available",
            value: money.headlineGmv,
            currency: money.dominantCurrency,
            otherCurrencyOrders: money.otherCurrencyOrders,
            otherCurrencyCount: money.otherCurrencyCount,
            comparison: gmvComparison,
            unlockGuidance: null,
          }
        : {
            status: "unavailable",
            value: null,
            currency: null,
            otherCurrencyOrders: 0,
            otherCurrencyCount: 0,
            comparison: null,
            unlockGuidance: money.unlockGuidance,
          },
    aov:
      money.status === "available"
        ? {
            status: "available",
            value: money.headlineAov,
            currency: money.dominantCurrency,
            basisNote: money.aovBasisNote,
            comparison: aovComparison,
            unlockGuidance: null,
          }
        : {
            status: "unavailable",
            value: null,
            currency: null,
            basisNote: null,
            comparison: null,
            unlockGuidance: money.unlockGuidance,
          },
  };
}

function fixedTrendSpec(scope: AnalyticsScope): {
  start: Prisma.Sql;
  end: Prisma.Sql;
  step: string;
} {
  if (scope.range.key === "24h") {
    return {
      start: Prisma.sql`date_trunc('hour', NOW() - INTERVAL '24 hours')`,
      end: Prisma.sql`date_trunc('hour', NOW())`,
      step: "1 hour",
    };
  }

  const days = scope.range.key === "7d" ? 7 : 30;
  return {
    start: Prisma.sql`date_trunc('day', NOW() - ${`${days} days`}::interval)`,
    end: Prisma.sql`date_trunc('day', NOW())`,
    step: "1 day",
  };
}

function trendBucketsCtes(
  scope: AnalyticsScope,
  granularity: TrendGranularity,
): Prisma.Sql {
  if (scope.range.isCustom) {
    const step = granularity === "hour" ? "1 hour" : granularity === "day" ? "1 day" : "1 month";
    const end =
      granularity === "hour"
        ? Prisma.sql`(${scope.range.custom.to}::date + INTERVAL '23 hours')`
        : Prisma.sql`date_trunc(${granularity}, ${scope.range.custom.to}::date)`;

    return Prisma.sql`
      buckets AS (
        SELECT generate_series(
          date_trunc(${granularity}, ${scope.range.custom.from}::date),
          ${end},
          ${step}::interval
        ) AS bucket
      )
    `;
  }

  if (scope.range.isAllTime) {
    const step = granularity === "day" ? "1 day" : "1 month";
    return Prisma.sql`
      bounds AS (
        SELECT
          date_trunc(${granularity}, MIN("createdAt")) AS start_bucket,
          date_trunc(${granularity}, NOW()) AS end_bucket
        FROM order_points
      ),
      buckets AS (
        SELECT generate_series(start_bucket, end_bucket, ${step}::interval) AS bucket
        FROM bounds
      )
    `;
  }

  const spec = fixedTrendSpec(scope);
  return Prisma.sql`
    buckets AS (
      SELECT generate_series(${spec.start}, ${spec.end}, ${spec.step}::interval) AS bucket
    )
  `;
}

export async function fetchSalesTrend(input: {
  scope: AnalyticsScope;
  granularity: TrendGranularity;
  orders: ConfirmedOrdersMeasurement | EstimatedOrdersMeasurement;
  dominantCurrency: string | null;
}): Promise<SalesTrend> {
  const orderPoints =
    input.orders.basis === ORDER_COUNT_BASIS.exact
      ? Prisma.sql`SELECT "createdAt" FROM identity_representatives`
      : Prisma.sql`SELECT "createdAt" FROM session_representatives`;
  const gmvValue = input.dominantCurrency
    ? Prisma.sql`COALESCE(g.gmv, 0)`
    : Prisma.sql`NULL::numeric`;

  const rows = await prisma.$queryRaw<TrendRow[]>`
    WITH
    ${orderFactsCtes(input.scope.sql.currentEvent)},
    order_points AS (${orderPoints}),
    ${trendBucketsCtes(input.scope, input.granularity)},
    orders_by_bucket AS (
      SELECT date_trunc(${input.granularity}, "createdAt") AS bucket, COUNT(*) AS orders
      FROM order_points
      GROUP BY bucket
    ),
    gmv_by_bucket AS (
      SELECT
        date_trunc(${input.granularity}, "createdAt") AS bucket,
        SUM(amount_value) AS gmv
      FROM money_representatives
      WHERE normalized_currency = ${input.dominantCurrency}
      GROUP BY bucket
    )
    SELECT
      TO_CHAR(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS bucket,
      COALESCE(o.orders, 0) AS orders,
      ${gmvValue} AS gmv
    FROM buckets b
    LEFT JOIN orders_by_bucket o ON o.bucket = b.bucket
    LEFT JOIN gmv_by_bucket g ON g.bucket = b.bucket
    ORDER BY b.bucket ASC
  `;

  return {
    granularity: input.granularity,
    orderBasis: input.orders.basis,
    gmvCurrency: input.dominantCurrency,
    points: rows.map((row) => ({
      date: row.bucket,
      orders: countFromDatabase(row.orders),
      gmv: row.gmv === null ? null : numberFromDatabase(row.gmv),
    })),
  };
}

function buildSalesInsights(
  comparison: SalesComparison,
): SalesInsight[] {
  const gmv = comparison.gmv;
  if (
    !gmv ||
    gmv.changePercent === null ||
    Math.abs(gmv.changePercent) < GMV_INSIGHT_THRESHOLD_PCT ||
    gmv.currentMoneyBearingOrders < GMV_INSIGHT_MIN_ORDERS ||
    gmv.previousMoneyBearingOrders < GMV_INSIGHT_MIN_ORDERS
  ) {
    return [];
  }

  const increased = gmv.changePercent > 0;
  const magnitude = Math.abs(gmv.changePercent);

  return [
    {
      id: "gmv-change",
      severity: increased ? "info" : "warning",
      title: `GMV ${increased ? "increased" : "decreased"}`,
      description: `${gmv.currency} GMV ${increased ? "rose" : "fell"} ${magnitude}% ${gmv.label.toLowerCase()}.`,
      changePercent: gmv.changePercent,
      currency: gmv.currency,
    },
  ];
}

export async function buildSalesAnalytics(
  scope: AnalyticsScope,
): Promise<SalesTabData> {
  const spanPromise = scope.range.isAllTime
    ? fetchTrendSpanDays(scope)
    : Promise.resolve<number | null>(null);
  const [headline, comparisonRows, allTimeSpanDays] = await Promise.all([
    fetchSalesHeadline(scope),
    fetchSalesComparisonRows(scope),
    spanPromise,
  ]);
  const currentSnapshot = buildPeriodSnapshot(
    comparisonRows,
    "current",
    headline.ownedHasOrderIdentity,
  );
  const previousSnapshot = buildPeriodSnapshot(
    comparisonRows,
    "previous",
    headline.ownedHasOrderIdentity,
  );
  const comparison = buildSalesComparison({
    current: currentSnapshot,
    previous: previousSnapshot,
    comparisonLabel: scope.comparison.label,
  });
  const granularity = resolveTrendGranularity(scope, allTimeSpanDays);
  const trend =
    headline.orders.status === "unavailable" || granularity === null
      ? null
      : await fetchSalesTrend({
          scope,
          granularity,
          orders: headline.orders,
          dominantCurrency:
            headline.money.status === "available"
              ? headline.money.dominantCurrency
              : null,
        });

  return {
    orders: headline.orders,
    money: headline.money,
    trend,
    comparison,
    insights: buildSalesInsights(comparison),
    dataQuality: headline.dataQuality,
  };
}
