import { Prisma } from "@prisma/client";
import type { AnalyticsScope } from "./analyticsScope";
import { SESSION_FUNNEL_STEPS } from "./shared/aliases";
import { percentOrNull, toCount } from "./shared/numbers";
import { prisma } from "../config/prisma";

interface ProductPerformanceRow {
  projectId: string;
  projectName: string;
  productId: string;
  productName: string | null;
  viewSessions: bigint;
  cartSessions: bigint;
  sessionsThatPurchased: bigint;
  viewPurchaseSessions: bigint;
  cartPurchaseSessions: bigint;
  unitsAddedToCart: Prisma.Decimal | null;
  gmv: Prisma.Decimal | null;
  currency: string | null;
}

interface CategoryPerformanceRow {
  projectId: string;
  projectName: string;
  category: string;
  viewSessions: bigint;
  cartSessions: bigint;
  sessionsThatPurchased: bigint;
  viewPurchaseSessions: bigint;
  cartPurchaseSessions: bigint;
  unitsAddedToCart: Prisma.Decimal | null;
  gmv: Prisma.Decimal | null;
  currency: string | null;
}

export async function fetchProductPerformanceRows(
  scope: AnalyticsScope,
): Promise<ProductPerformanceRow[]> {
  // Product performance: one row per project-scoped product identity.
  // Repeated interactions collapse to one project-scoped session, and a
  // purchase counts only when it happened after that product interaction.
  // GMV stays unavailable in Phase 0A because current purchase events do
  // not reliably distinguish product-level money from order-level money.
  return prisma.$queryRaw<ProductPerformanceRow[]>`
    WITH scoped_events AS (
      SELECT
        e.id,
        e."projectId",
        p.name AS "projectName",
        LOWER(e.name) AS name,
        e.properties,
        e."sessionId",
        e."createdAt",
        COALESCE(
          NULLIF(BTRIM(e.properties->>'product_id'), ''),
          NULLIF(BTRIM(e.properties->>'productId'), '')
        ) AS "productId",
        COALESCE(
          NULLIF(BTRIM(e.properties->>'product_name'), ''),
          NULLIF(BTRIM(e.properties->>'productName'), '')
        ) AS "productName",
        CASE
          WHEN (e.properties->>'quantity') ~ '^[0-9]+([.][0-9]+)?$'
            THEN (e.properties->>'quantity')::numeric
          ELSE NULL
        END AS quantity
      FROM "Event" e
      JOIN "Project" p ON p.id = e."projectId"
      WHERE ${scope.sql.currentAliasedEvent}
        AND e."sessionId" IS NOT NULL
    ),
    product_sessions AS (
      SELECT
        "projectId",
        MAX("projectName") AS "projectName",
        "productId",
        "sessionId",
        (
          ARRAY_AGG("productName" ORDER BY "createdAt" DESC, id DESC)
            FILTER (WHERE "productName" IS NOT NULL)
        )[1] AS "productName",
        MAX("createdAt") FILTER (WHERE "productName" IS NOT NULL) AS "metadataAt",
        MIN("createdAt") FILTER (
          WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[0].aliases])})
        ) AS "firstViewAt",
        MIN("createdAt") FILTER (
          WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[1].aliases])})
        ) AS "firstCartAt",
        MIN("createdAt") AS "firstInteractionAt",
        SUM(
          CASE
            WHEN name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[1].aliases])})
              THEN COALESCE(quantity, 1)
            ELSE 0
          END
        ) AS "unitsAddedToCart"
      FROM scoped_events
      WHERE "productId" IS NOT NULL
        AND name IN (${Prisma.join([
          ...SESSION_FUNNEL_STEPS[0].aliases,
          ...SESSION_FUNNEL_STEPS[1].aliases,
        ])})
      GROUP BY "projectId", "productId", "sessionId"
    ),
    purchase_sessions AS (
      SELECT
        "projectId",
        "sessionId",
        MAX("createdAt") AS "lastPurchaseAt"
      FROM scoped_events
      WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[3].aliases])})
      GROUP BY "projectId", "sessionId"
    )
    SELECT
      ps."projectId",
      MAX(ps."projectName") AS "projectName",
      ps."productId",
      (
        ARRAY_AGG(
          ps."productName"
          ORDER BY ps."metadataAt" DESC NULLS LAST, ps."sessionId" DESC
        ) FILTER (WHERE ps."productName" IS NOT NULL)
      )[1] AS "productName",
      COUNT(*) FILTER (WHERE ps."firstViewAt" IS NOT NULL) AS "viewSessions",
      COUNT(*) FILTER (WHERE ps."firstCartAt" IS NOT NULL) AS "cartSessions",
      COUNT(*) FILTER (
        WHERE p."lastPurchaseAt" > ps."firstInteractionAt"
      ) AS "sessionsThatPurchased",
      COUNT(*) FILTER (
        WHERE ps."firstViewAt" IS NOT NULL
          AND p."lastPurchaseAt" > ps."firstViewAt"
      ) AS "viewPurchaseSessions",
      COUNT(*) FILTER (
        WHERE ps."firstCartAt" IS NOT NULL
          AND p."lastPurchaseAt" > ps."firstCartAt"
      ) AS "cartPurchaseSessions",
      COALESCE(SUM(ps."unitsAddedToCart"), 0) AS "unitsAddedToCart",
      NULL::numeric AS gmv,
      NULL::text AS currency
    FROM product_sessions ps
    LEFT JOIN purchase_sessions p
      ON p."projectId" = ps."projectId"
      AND p."sessionId" = ps."sessionId"
    GROUP BY ps."projectId", ps."productId"
    ORDER BY
      (
        COUNT(*) FILTER (WHERE ps."firstViewAt" IS NOT NULL) +
        COUNT(*) FILTER (WHERE ps."firstCartAt" IS NOT NULL) +
        COUNT(*) FILTER (WHERE p."lastPurchaseAt" > ps."firstInteractionAt")
      ) DESC,
      MAX(ps."projectName") ASC,
      ps."productId" ASC
    LIMIT 15
  `;
}

export async function fetchCategoryPerformanceRows(
  scope: AnalyticsScope,
): Promise<CategoryPerformanceRow[]> {
  // Category performance follows the same project-scoped, ordered
  // session-outcome attribution as products. Category comes only from
  // view/cart interactions; no purchase event is used to fabricate it.
  return prisma.$queryRaw<CategoryPerformanceRow[]>`
    WITH scoped_events AS (
      SELECT
        e.id,
        e."projectId",
        p.name AS "projectName",
        LOWER(e.name) AS name,
        e.properties,
        e."sessionId",
        e."createdAt",
        NULLIF(BTRIM(e.properties->>'category'), '') AS category,
        CASE
          WHEN (e.properties->>'quantity') ~ '^[0-9]+([.][0-9]+)?$'
            THEN (e.properties->>'quantity')::numeric
          ELSE NULL
        END AS quantity
      FROM "Event" e
      JOIN "Project" p ON p.id = e."projectId"
      WHERE ${scope.sql.currentAliasedEvent}
        AND e."sessionId" IS NOT NULL
    ),
    category_sessions AS (
      SELECT
        "projectId",
        MAX("projectName") AS "projectName",
        category,
        "sessionId",
        MIN("createdAt") FILTER (
          WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[0].aliases])})
        ) AS "firstViewAt",
        MIN("createdAt") FILTER (
          WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[1].aliases])})
        ) AS "firstCartAt",
        MIN("createdAt") AS "firstInteractionAt",
        SUM(
          CASE
            WHEN name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[1].aliases])})
              THEN COALESCE(quantity, 1)
            ELSE 0
          END
        ) AS "unitsAddedToCart"
      FROM scoped_events
      WHERE category IS NOT NULL
        AND name IN (${Prisma.join([
          ...SESSION_FUNNEL_STEPS[0].aliases,
          ...SESSION_FUNNEL_STEPS[1].aliases,
        ])})
      GROUP BY "projectId", category, "sessionId"
    ),
    purchase_sessions AS (
      SELECT
        "projectId",
        "sessionId",
        MAX("createdAt") AS "lastPurchaseAt"
      FROM scoped_events
      WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[3].aliases])})
      GROUP BY "projectId", "sessionId"
    )
    SELECT
      cs."projectId",
      MAX(cs."projectName") AS "projectName",
      cs.category,
      COUNT(*) FILTER (WHERE cs."firstViewAt" IS NOT NULL) AS "viewSessions",
      COUNT(*) FILTER (WHERE cs."firstCartAt" IS NOT NULL) AS "cartSessions",
      COUNT(*) FILTER (
        WHERE p."lastPurchaseAt" > cs."firstInteractionAt"
      ) AS "sessionsThatPurchased",
      COUNT(*) FILTER (
        WHERE cs."firstViewAt" IS NOT NULL
          AND p."lastPurchaseAt" > cs."firstViewAt"
      ) AS "viewPurchaseSessions",
      COUNT(*) FILTER (
        WHERE cs."firstCartAt" IS NOT NULL
          AND p."lastPurchaseAt" > cs."firstCartAt"
      ) AS "cartPurchaseSessions",
      COALESCE(SUM(cs."unitsAddedToCart"), 0) AS "unitsAddedToCart",
      NULL::numeric AS gmv,
      NULL::text AS currency
    FROM category_sessions cs
    LEFT JOIN purchase_sessions p
      ON p."projectId" = cs."projectId"
      AND p."sessionId" = cs."sessionId"
    GROUP BY cs."projectId", cs.category
    ORDER BY
      (
        COUNT(*) FILTER (WHERE cs."firstViewAt" IS NOT NULL) +
        COUNT(*) FILTER (WHERE cs."firstCartAt" IS NOT NULL) +
        COUNT(*) FILTER (WHERE p."lastPurchaseAt" > cs."firstInteractionAt")
      ) DESC,
      MAX(cs."projectName") ASC,
      cs.category ASC
    LIMIT 8
  `;
}

export interface ProductStat {
  projectId: string;
  projectName: string;
  productId: string;
  productName: string | null;
  viewSessions: number;
  cartSessions: number;
  sessionsThatPurchased: number;
  viewToPurchasePercent: number | null;
  cartToPurchasePercent: number | null;
  unitsAddedToCart: number;
  gmv: number | null;
  currency: string | null;
}

export interface CategoryStat {
  projectId: string;
  projectName: string;
  category: string;
  viewSessions: number;
  cartSessions: number;
  sessionsThatPurchased: number;
  viewToPurchasePercent: number | null;
  cartToPurchasePercent: number | null;
  unitsAddedToCart: number;
  gmv: number | null;
  currency: string | null;
}

export interface ProductPerformance {
  hasProductData: boolean;
  products: ProductStat[];
  highViewLowPurchase: ProductStat[];
  highCartLowPurchase: ProductStat[];
  categories: CategoryStat[];
}

export function buildProductPerformance(params: {
  productRows: ProductPerformanceRow[];
  categoryRows: CategoryPerformanceRow[];
}): ProductPerformance {
  const products: ProductStat[] = params.productRows.map((row) => {
    const viewSessions = toCount(row.viewSessions);
    const cartSessions = toCount(row.cartSessions);
    const viewPurchaseSessions = toCount(row.viewPurchaseSessions);
    const cartPurchaseSessions = toCount(row.cartPurchaseSessions);

    return {
      projectId: row.projectId,
      projectName: row.projectName,
      productId: row.productId,
      productName: row.productName,
      viewSessions,
      cartSessions,
      sessionsThatPurchased: toCount(row.sessionsThatPurchased),
      viewToPurchasePercent: percentOrNull(
        viewPurchaseSessions,
        viewSessions,
      ),
      cartToPurchasePercent: percentOrNull(
        cartPurchaseSessions,
        cartSessions,
      ),
      unitsAddedToCart: Number(row.unitsAddedToCart ?? 0),
      gmv: row.gmv === null ? null : Number(row.gmv),
      currency: row.currency,
    };
  });

  const categories: CategoryStat[] = params.categoryRows.map((row) => {
    const viewSessions = toCount(row.viewSessions);
    const cartSessions = toCount(row.cartSessions);
    const viewPurchaseSessions = toCount(row.viewPurchaseSessions);
    const cartPurchaseSessions = toCount(row.cartPurchaseSessions);

    return {
      projectId: row.projectId,
      projectName: row.projectName,
      category: row.category,
      viewSessions,
      cartSessions,
      sessionsThatPurchased: toCount(row.sessionsThatPurchased),
      viewToPurchasePercent: percentOrNull(
        viewPurchaseSessions,
        viewSessions,
      ),
      cartToPurchasePercent: percentOrNull(
        cartPurchaseSessions,
        cartSessions,
      ),
      unitsAddedToCart: Number(row.unitsAddedToCart ?? 0),
      gmv: row.gmv === null ? null : Number(row.gmv),
      currency: row.currency,
    };
  });

  return {
    hasProductData: products.length > 0,
    products,
    highViewLowPurchase: products
      .filter(
        (product) =>
          product.viewSessions >= 20 &&
          product.viewToPurchasePercent !== null &&
          product.viewToPurchasePercent < 5,
      )
      .sort((a, b) => b.viewSessions - a.viewSessions)
      .slice(0, 6),
    highCartLowPurchase: products
      .filter(
        (product) =>
          product.cartSessions >= 10 &&
          product.cartToPurchasePercent !== null &&
          product.cartToPurchasePercent < 30,
      )
      .sort((a, b) => b.cartSessions - a.cartSessions)
      .slice(0, 6),
    categories,
  };
}

