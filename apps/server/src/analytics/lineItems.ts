import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import {
  CURRENCY_CODE_PATTERN,
  NON_NEGATIVE_MONEY_SQL_PATTERN,
} from "../contract/moneyRules";
import { ORDER_FACT_EVENT_NAMES } from "../contract/orderIdentity";
import type { AnalyticsScope } from "./analyticsScope";
import { roundPct } from "./shared/numbers";

const CURRENCY_SQL_PATTERN = CURRENCY_CODE_PATTERN.source;
const POSITIVE_QUANTITY_SQL_PATTERN = "^[0-9]+([.][0-9]+)?$";

interface LineItemMetricRow {
  projectId: string | null;
  dimensionId: string | null;
  confirmedUnitsSold: Prisma.Decimal | null;
  currency: string | null;
  lineRevenue: Prisma.Decimal | null;
  moneyBearingOrders: bigint | null;
  eligibleConfirmedOrders: bigint;
  ordersWithUsableItems: bigint;
  malformedLines: bigint;
  missingProductIdLines: bigint;
  invalidQuantityLines: bigint;
  invalidPriceLines: bigint;
  missingCategoryLines: bigint;
  invalidCurrencyLines: bigint;
}

// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export interface ItemsCoverage {
  status: "complete" | "partial" | "unavailable";
  eligibleConfirmedOrders: number;
  ordersWithUsableItems: number;
  percentage: number | null;
  skippedLines: {
    malformed: number;
    missingProductId: number;
    invalidQuantity: number;
    invalidPrice: number;
    missingCategory: number;
    invalidCurrency: number;
  };
  unlockGuidance: string | null;
}

export interface LineRevenueCurrencySlice {
  currency: string;
  value: number;
  confirmedOrders: number;
}

export type LineRevenueMeasurement =
  | {
      status: "available";
      value: number;
      currency: string;
      currencies: LineRevenueCurrencySlice[];
      otherCurrencyOrders: number;
      otherCurrencyCount: number;
      unlockGuidance: null;
    }
  | {
      status: "unavailable";
      value: null;
      currency: null;
      currencies: [];
      otherCurrencyOrders: 0;
      otherCurrencyCount: 0;
      unlockGuidance: string;
    };

export interface LineItemMetric {
  projectId: string;
  dimensionId: string;
  lineRevenue: LineRevenueMeasurement;
  confirmedUnitsSold: number;
  itemsCoverage: ItemsCoverage;
}

export interface LineItemAttributionResult {
  itemsCoverage: ItemsCoverage;
  metrics: LineItemMetric[];
}

function orderFactNamesSql(): Prisma.Sql {
  return Prisma.join([...ORDER_FACT_EVENT_NAMES]);
}

function orderFactNamePrioritySql(): Prisma.Sql {
  return Prisma.sql`
    CASE
      ${Prisma.join(
        ORDER_FACT_EVENT_NAMES.map(
          (eventName, priority) =>
            Prisma.sql`WHEN LOWER(name) = ${eventName} THEN ${priority}`,
        ),
        " ",
      )}
      ELSE ${ORDER_FACT_EVENT_NAMES.length}
    END
  `;
}

function lineItemCtes(eventScope: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    scoped_order_facts AS (
      SELECT
        e.id,
        e.name,
        e.properties,
        e."projectId",
        e."createdAt",
        NULLIF(BTRIM(e.properties->>'order_id'), '') AS order_id,
        e.properties->>'currency' AS currency_text
      FROM "Event" e
      WHERE ${eventScope}
        AND LOWER(e.name) IN (${orderFactNamesSql()})
    ),
    identity_ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY "projectId", order_id
          ORDER BY "createdAt" ASC, id ASC
        ) AS identity_rank
      FROM scoped_order_facts
      WHERE order_id IS NOT NULL
    ),
    identity_representatives AS (
      SELECT *
      FROM identity_ranked
      WHERE identity_rank = 1
    ),
    items_candidates AS (
      SELECT *
      FROM scoped_order_facts
      WHERE order_id IS NOT NULL
        AND CASE
          WHEN jsonb_typeof(properties->'items') = 'array'
            THEN jsonb_array_length(properties->'items') > 0
          ELSE FALSE
        END
    ),
    items_ranked AS (
      -- The frozen order-fact array defines representative priority. Timestamp
      -- and id provide deterministic tie-breakers within the same event name.
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY "projectId", order_id
          ORDER BY
            ${orderFactNamePrioritySql()} ASC,
            "createdAt" ASC,
            id ASC
        ) AS items_rank
      FROM items_candidates
    ),
    items_representatives AS (
      SELECT *
      FROM items_ranked
      WHERE items_rank = 1
    ),
    item_lines AS (
      SELECT
        r."projectId",
        r.order_id,
        r.currency_text,
        line.item,
        line.ordinality
      FROM items_representatives r
      CROSS JOIN LATERAL jsonb_array_elements(r.properties->'items')
        WITH ORDINALITY AS line(item, ordinality)
    ),
    normalized_lines AS (
      SELECT
        "projectId",
        order_id,
        currency_text,
        item,
        ordinality,
        jsonb_typeof(item) AS item_type,
        CASE
          WHEN jsonb_typeof(item) = 'object'
            THEN NULLIF(BTRIM(item->>'product_id'), '')
          ELSE NULL
        END AS product_id,
        CASE
          WHEN jsonb_typeof(item) = 'object'
            THEN NULLIF(BTRIM(item->>'category'), '')
          ELSE NULL
        END AS category,
        CASE
          WHEN jsonb_typeof(item) = 'object'
            THEN BTRIM(item->>'quantity')
          ELSE NULL
        END AS quantity_text,
        CASE
          WHEN jsonb_typeof(item) = 'object'
            THEN BTRIM(item->>'price')
          ELSE NULL
        END AS price_text
      FROM item_lines
    ),
    classified_lines AS (
      SELECT
        *,
        CASE
          WHEN quantity_text ~ ${POSITIVE_QUANTITY_SQL_PATTERN}
            AND quantity_text::numeric > 0
            THEN quantity_text::numeric
          ELSE NULL
        END AS quantity_value,
        CASE
          WHEN price_text ~ ${NON_NEGATIVE_MONEY_SQL_PATTERN}
            THEN price_text::numeric
          ELSE NULL
        END AS price_value,
        CASE
          WHEN BTRIM(currency_text) ~ ${CURRENCY_SQL_PATTERN}
            THEN BTRIM(currency_text)
          ELSE NULL
        END AS normalized_currency
      FROM normalized_lines
    ),
    line_quality AS (
      SELECT
        COUNT(*) FILTER (WHERE item_type <> 'object') AS malformed_lines,
        COUNT(*) FILTER (
          WHERE item_type = 'object' AND product_id IS NULL
        ) AS missing_product_id_lines,
        COUNT(*) FILTER (
          WHERE item_type = 'object' AND quantity_value IS NULL
        ) AS invalid_quantity_lines,
        COUNT(*) FILTER (
          WHERE item_type = 'object' AND price_value IS NULL
        ) AS invalid_price_lines,
        COUNT(*) FILTER (
          WHERE item_type = 'object' AND category IS NULL
        ) AS missing_category_lines,
        COUNT(*) FILTER (
          WHERE product_id IS NOT NULL
            AND quantity_value IS NOT NULL
            AND price_value IS NOT NULL
            AND normalized_currency IS NULL
        ) AS invalid_currency_lines
      FROM classified_lines
    )
  `;
}

function coverageSql(usableCondition: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    coverage AS (
      SELECT
        (SELECT COUNT(*) FROM identity_representatives)
          AS eligible_confirmed_orders,
        (
          SELECT COUNT(*)
          FROM (
            SELECT DISTINCT "projectId", order_id
            FROM classified_lines
            WHERE ${usableCondition}
          ) usable_orders
        ) AS orders_with_usable_items
    )
  `;
}

async function fetchProductLineItemRows(
  scope: AnalyticsScope,
): Promise<LineItemMetricRow[]> {
  return prisma.$queryRaw<LineItemMetricRow[]>`
    WITH
    ${lineItemCtes(scope.sql.currentAliasedEvent)},
    ${coverageSql(Prisma.sql`
      product_id IS NOT NULL AND quantity_value IS NOT NULL
    `)},
    product_units AS (
      SELECT
        "projectId",
        product_id AS dimension_id,
        SUM(quantity_value) AS confirmed_units_sold
      FROM classified_lines
      WHERE product_id IS NOT NULL
        AND quantity_value IS NOT NULL
      GROUP BY "projectId", product_id
    ),
    product_revenue_slices AS (
      SELECT
        "projectId",
        product_id AS dimension_id,
        normalized_currency AS currency,
        SUM(price_value * quantity_value) AS line_revenue,
        COUNT(DISTINCT order_id) AS money_bearing_orders
      FROM classified_lines
      WHERE product_id IS NOT NULL
        AND quantity_value IS NOT NULL
        AND price_value IS NOT NULL
        AND normalized_currency IS NOT NULL
      GROUP BY "projectId", product_id, normalized_currency
    ),
    product_metrics AS (
      SELECT
        u."projectId",
        u.dimension_id,
        u.confirmed_units_sold,
        r.currency,
        r.line_revenue,
        r.money_bearing_orders
      FROM product_units u
      LEFT JOIN product_revenue_slices r
        ON r."projectId" = u."projectId"
       AND r.dimension_id = u.dimension_id
    )
    SELECT
      m."projectId" AS "projectId",
      m.dimension_id AS "dimensionId",
      m.confirmed_units_sold AS "confirmedUnitsSold",
      m.currency,
      m.line_revenue AS "lineRevenue",
      m.money_bearing_orders AS "moneyBearingOrders",
      c.eligible_confirmed_orders AS "eligibleConfirmedOrders",
      c.orders_with_usable_items AS "ordersWithUsableItems",
      q.malformed_lines AS "malformedLines",
      q.missing_product_id_lines AS "missingProductIdLines",
      q.invalid_quantity_lines AS "invalidQuantityLines",
      q.invalid_price_lines AS "invalidPriceLines",
      q.missing_category_lines AS "missingCategoryLines",
      q.invalid_currency_lines AS "invalidCurrencyLines"
    FROM coverage c
    CROSS JOIN line_quality q
    LEFT JOIN product_metrics m ON TRUE
    ORDER BY
      m."projectId" ASC NULLS LAST,
      m.dimension_id ASC NULLS LAST,
      m.money_bearing_orders DESC NULLS LAST,
      m.currency ASC NULLS LAST
  `;
}

async function fetchCategoryLineItemRows(
  scope: AnalyticsScope,
): Promise<LineItemMetricRow[]> {
  return prisma.$queryRaw<LineItemMetricRow[]>`
    WITH
    ${lineItemCtes(scope.sql.currentAliasedEvent)},
    ${coverageSql(Prisma.sql`
      product_id IS NOT NULL
      AND category IS NOT NULL
      AND quantity_value IS NOT NULL
    `)},
    category_units AS (
      SELECT
        "projectId",
        category AS dimension_id,
        SUM(quantity_value) AS confirmed_units_sold
      FROM classified_lines
      WHERE product_id IS NOT NULL
        AND category IS NOT NULL
        AND quantity_value IS NOT NULL
      GROUP BY "projectId", category
    ),
    category_revenue_slices AS (
      SELECT
        "projectId",
        category AS dimension_id,
        normalized_currency AS currency,
        SUM(price_value * quantity_value) AS line_revenue,
        COUNT(DISTINCT order_id) AS money_bearing_orders
      FROM classified_lines
      WHERE product_id IS NOT NULL
        AND category IS NOT NULL
        AND quantity_value IS NOT NULL
        AND price_value IS NOT NULL
        AND normalized_currency IS NOT NULL
      GROUP BY "projectId", category, normalized_currency
    ),
    category_metrics AS (
      SELECT
        u."projectId",
        u.dimension_id,
        u.confirmed_units_sold,
        r.currency,
        r.line_revenue,
        r.money_bearing_orders
      FROM category_units u
      LEFT JOIN category_revenue_slices r
        ON r."projectId" = u."projectId"
       AND r.dimension_id = u.dimension_id
    )
    SELECT
      m."projectId" AS "projectId",
      m.dimension_id AS "dimensionId",
      m.confirmed_units_sold AS "confirmedUnitsSold",
      m.currency,
      m.line_revenue AS "lineRevenue",
      m.money_bearing_orders AS "moneyBearingOrders",
      c.eligible_confirmed_orders AS "eligibleConfirmedOrders",
      c.orders_with_usable_items AS "ordersWithUsableItems",
      q.malformed_lines AS "malformedLines",
      q.missing_product_id_lines AS "missingProductIdLines",
      q.invalid_quantity_lines AS "invalidQuantityLines",
      q.invalid_price_lines AS "invalidPriceLines",
      q.missing_category_lines AS "missingCategoryLines",
      q.invalid_currency_lines AS "invalidCurrencyLines"
    FROM coverage c
    CROSS JOIN line_quality q
    LEFT JOIN category_metrics m ON TRUE
    ORDER BY
      m."projectId" ASC NULLS LAST,
      m.dimension_id ASC NULLS LAST,
      m.money_bearing_orders DESC NULLS LAST,
      m.currency ASC NULLS LAST
  `;
}

function countFromDatabase(value: bigint | null | undefined): number {
  return Number(value ?? 0n);
}

function buildItemsCoverage(
  row: LineItemMetricRow | undefined,
  dimension: "product" | "category",
): ItemsCoverage {
  const eligibleConfirmedOrders = countFromDatabase(
    row?.eligibleConfirmedOrders,
  );
  const ordersWithUsableItems = countFromDatabase(
    row?.ordersWithUsableItems,
  );
  const remainingOrders = Math.max(
    eligibleConfirmedOrders - ordersWithUsableItems,
    0,
  );
  const requiredFields =
    dimension === "product"
      ? "product_id and a positive quantity"
      : "product_id, category, and a positive quantity";
  const status =
    eligibleConfirmedOrders === 0 || ordersWithUsableItems === 0
      ? "unavailable"
      : ordersWithUsableItems < eligibleConfirmedOrders
        ? "partial"
        : "complete";

  return {
    status,
    eligibleConfirmedOrders,
    ordersWithUsableItems,
    percentage:
      eligibleConfirmedOrders === 0
        ? null
        : roundPct((ordersWithUsableItems / eligibleConfirmedOrders) * 100),
    skippedLines: {
      malformed: countFromDatabase(row?.malformedLines),
      missingProductId: countFromDatabase(row?.missingProductIdLines),
      invalidQuantity: countFromDatabase(row?.invalidQuantityLines),
      invalidPrice: countFromDatabase(row?.invalidPriceLines),
      missingCategory: countFromDatabase(row?.missingCategoryLines),
      invalidCurrency: countFromDatabase(row?.invalidCurrencyLines),
    },
    unlockGuidance:
      status === "complete"
        ? null
        : eligibleConfirmedOrders === 0
          ? "Send purchase_completed with order_id and non-empty items[] to unlock confirmed line-item analytics."
          : ordersWithUsableItems === 0
            ? `Add non-empty items[] with ${requiredFields} to confirmed purchase events.`
            : `Add usable items[] to ${remainingOrders} more confirmed ${remainingOrders === 1 ? "order" : "orders"}; each line needs ${requiredFields}.`,
  };
}

function buildUnavailableLineRevenue(
  coverage: ItemsCoverage,
  dimension: "product" | "category",
): LineRevenueMeasurement {
  const metricLabel = `${dimension} line revenue`;
  const hasInvalidPrice = coverage.skippedLines.invalidPrice > 0;
  const hasInvalidCurrency = coverage.skippedLines.invalidCurrency > 0;
  let unlockGuidance =
    `Add a valid line price and uppercase purchase currency to items[] orders to calculate ${metricLabel}.`;

  if (coverage.ordersWithUsableItems === 0 && coverage.unlockGuidance) {
    unlockGuidance = coverage.unlockGuidance;
  } else if (hasInvalidCurrency && !hasInvalidPrice) {
    unlockGuidance =
      `Add an uppercase ISO-4217 currency to purchase_completed events to calculate ${metricLabel}.`;
  } else if (hasInvalidPrice && !hasInvalidCurrency) {
    unlockGuidance =
      `Add a valid non-negative price to each items[] line to calculate ${metricLabel}.`;
  }

  return {
    status: "unavailable",
    value: null,
    currency: null,
    currencies: [],
    otherCurrencyOrders: 0,
    otherCurrencyCount: 0,
    unlockGuidance,
  };
}

function buildLineItemMetrics(
  rows: LineItemMetricRow[],
  dimension: "product" | "category",
): LineItemAttributionResult {
  const itemsCoverage = buildItemsCoverage(rows[0], dimension);
  const grouped = new Map<string, LineItemMetricRow[]>();

  for (const row of rows) {
    if (row.projectId === null || row.dimensionId === null) {
      continue;
    }

    const key = `${row.projectId}:${row.dimensionId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(key, [row]);
    }
  }

  const metrics = [...grouped.values()].map((metricRows) => {
    const first = metricRows[0];
    const currencies = metricRows
      .filter(
        (row): row is LineItemMetricRow & { currency: string } =>
          row.currency !== null && row.lineRevenue !== null,
      )
      .map((row) => ({
        currency: row.currency,
        value: Number(row.lineRevenue),
        confirmedOrders: countFromDatabase(row.moneyBearingOrders),
      }))
      .sort(
        (a, b) =>
          b.confirmedOrders - a.confirmedOrders ||
          a.currency.localeCompare(b.currency),
      );
    const dominantCurrency = currencies[0];
    const lineRevenue: LineRevenueMeasurement = dominantCurrency
      ? {
          status: "available",
          value: dominantCurrency.value,
          currency: dominantCurrency.currency,
          currencies,
          otherCurrencyOrders: currencies
            .slice(1)
            .reduce((sum, slice) => sum + slice.confirmedOrders, 0),
          otherCurrencyCount: Math.max(currencies.length - 1, 0),
          unlockGuidance: null,
        }
      : buildUnavailableLineRevenue(itemsCoverage, dimension);

    return {
      projectId: first.projectId as string,
      dimensionId: first.dimensionId as string,
      lineRevenue,
      confirmedUnitsSold: Number(first.confirmedUnitsSold ?? 0),
      itemsCoverage,
    };
  });

  return { itemsCoverage, metrics };
}

export async function fetchProductLineItemAttribution(
  scope: AnalyticsScope,
): Promise<LineItemAttributionResult> {
  const rows = await fetchProductLineItemRows(scope);
  return buildLineItemMetrics(rows, "product");
}

export async function fetchCategoryLineItemAttribution(
  scope: AnalyticsScope,
): Promise<LineItemAttributionResult> {
  const rows = await fetchCategoryLineItemRows(scope);
  return buildLineItemMetrics(rows, "category");
}
