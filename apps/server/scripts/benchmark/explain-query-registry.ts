import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AnalyticsScope } from "../../src/analytics/analyticsScope";
import type {
  AnalyticsQueryDefinition,
  AnalyticsQueryId,
  ExplainTarget,
} from "./explain-types";

export const ANALYTICS_QUERY_REGISTRY: AnalyticsQueryDefinition[] = [
  {
    id: 1,
    key: "event-total",
    module: "eventActivity",
    label: "Total scoped events",
    tabs: ["overview", "behavior"],
    source: "apps/server/src/analytics/eventActivity.ts:84",
    sourceStatementIndex: 1,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 2,
    key: "events-today",
    module: "eventActivity",
    label: "Events since database-session midnight",
    tabs: ["overview", "behavior"],
    source: "apps/server/src/analytics/eventActivity.ts:92",
    sourceStatementIndex: 2,
    supportedScopes: ["all", "single"],
    supportedRanges: ["30d"],
  },
  {
    id: 3,
    key: "unique-event-names",
    module: "eventActivity",
    label: "Distinct event names",
    tabs: ["overview", "behavior"],
    source: "apps/server/src/analytics/eventActivity.ts:99",
    sourceStatementIndex: 3,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 4,
    key: "active-projects",
    module: "eventActivity",
    label: "Distinct projects with events",
    tabs: ["overview", "behavior"],
    source: "apps/server/src/analytics/eventActivity.ts:106",
    sourceStatementIndex: 4,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 5,
    key: "top-events",
    module: "eventActivity",
    label: "Top event names",
    tabs: ["overview", "behavior"],
    source: "apps/server/src/analytics/eventActivity.ts:113",
    sourceStatementIndex: 5,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 6,
    key: "events-by-project",
    module: "eventActivity",
    label: "Event counts by project",
    tabs: ["overview", "behavior"],
    source: "apps/server/src/analytics/eventActivity.ts:123",
    sourceStatementIndex: 6,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 7,
    key: "recent-events",
    module: "eventActivity",
    label: "Recent event activity",
    tabs: ["overview", "behavior"],
    source: "apps/server/src/analytics/eventActivity.ts:134",
    sourceStatementIndex: 7,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 8,
    key: "top-property-keys",
    module: "eventActivity",
    label: "Top JSON property keys",
    tabs: ["overview", "behavior"],
    source: "apps/server/src/analytics/eventActivity.ts:145",
    sourceStatementIndex: 8,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 9,
    key: "total-active-projects",
    module: "eventActivity",
    label: "Owned active projects",
    tabs: ["overview", "behavior"],
    source: "apps/server/src/analytics/eventActivity.ts:158",
    sourceStatementIndex: 9,
    supportedScopes: ["all"],
    supportedRanges: ["all"],
  },
  {
    id: 10,
    key: "all-time-span",
    module: "trend",
    label: "All-time event span",
    tabs: ["overview"],
    source: "apps/server/src/analytics/trend.ts:53",
    sourceStatementIndex: 1,
    supportedScopes: ["all", "single"],
    supportedRanges: ["all"],
  },
  {
    id: 11,
    key: "preset-trend",
    module: "trend",
    label: "Preset-range trend buckets",
    tabs: ["overview"],
    source: "apps/server/src/analytics/trend.ts:146",
    sourceStatementIndex: 4,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d"],
  },
  {
    id: 12,
    key: "custom-trend",
    module: "trend",
    label: "Custom-range trend buckets",
    tabs: ["overview"],
    source: "apps/server/src/analytics/trend.ts:98",
    sourceStatementIndex: 2,
    supportedScopes: ["all", "single"],
    supportedRanges: ["custom-long"],
  },
  {
    id: 13,
    key: "all-time-trend",
    module: "trend",
    label: "All-time trend buckets",
    tabs: ["overview"],
    source: "apps/server/src/analytics/trend.ts:121",
    sourceStatementIndex: 3,
    supportedScopes: ["all", "single"],
    supportedRanges: ["all"],
  },
  {
    id: 14,
    key: "period-comparison",
    module: "comparison",
    label: "Current and previous period counts",
    tabs: ["overview"],
    source: "apps/server/src/analytics/comparison.ts:30",
    sourceStatementIndex: 1,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 15,
    key: "commerce-funnel-events",
    module: "commerceFunnel",
    label: "Raw commerce funnel and friction event counts",
    tabs: ["conversion"],
    source: "apps/server/src/analytics/commerceFunnel.ts:68",
    sourceStatementIndex: 1,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 16,
    key: "session-funnel",
    module: "sessionFunnel",
    label: "Distinct-session conversion funnel",
    tabs: ["conversion"],
    source: "apps/server/src/analytics/sessionFunnel.ts:64",
    sourceStatementIndex: 1,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 17,
    key: "shopper-summary",
    module: "shopperSummary",
    label: "Distinct shopper and session summary",
    tabs: ["shoppers"],
    source: "apps/server/src/analytics/shopperSummary.ts:25",
    sourceStatementIndex: 1,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 18,
    key: "product-performance",
    module: "productPerformance",
    label: "Product performance CTE",
    tabs: ["products"],
    source: "apps/server/src/analytics/productPerformance.ts:44",
    sourceStatementIndex: 1,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
  {
    id: 19,
    key: "category-performance",
    module: "productPerformance",
    label: "Category performance CTE",
    tabs: ["products"],
    source: "apps/server/src/analytics/productPerformance.ts:163",
    sourceStatementIndex: 2,
    supportedScopes: ["all", "single"],
    supportedRanges: ["24h", "7d", "30d", "custom-long", "all"],
  },
];

interface CapturedQuery {
  text: string;
  values: readonly unknown[];
  shapeHash: string;
}

interface QueryRawHolder {
  $queryRaw: (query: unknown, ...values: unknown[]) => Promise<unknown>;
  $disconnect: () => Promise<void>;
}

let productionPrisma: QueryRawHolder | null = null;
let captureInProgress = false;

function isSql(value: unknown): value is Prisma.Sql {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { text?: unknown }).text === "string" &&
    Array.isArray((value as { values?: unknown }).values)
  );
}

function isTemplateStringsArray(value: unknown): value is TemplateStringsArray {
  return Array.isArray(value) && Array.isArray((value as { raw?: unknown }).raw);
}

function toSql(query: unknown, values: unknown[]): Prisma.Sql {
  if (isSql(query)) return query;
  if (isTemplateStringsArray(query)) {
    return Prisma.sql(query, ...(values as never[]));
  }
  throw new Error("Production analytics emitted an unsupported raw-query shape.");
}

function assertReadOnlySelect(query: Prisma.Sql): void {
  const normalized = query.text.trim();
  if (!/^(SELECT|WITH)\b/i.test(normalized)) {
    throw new Error("EXPLAIN registry captured a non-SELECT analytics statement.");
  }
  if (
    /\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COPY|CALL|DO|VACUUM|ANALYZE)\b/i.test(
      normalized,
    )
  ) {
    throw new Error("EXPLAIN registry rejected a potentially mutating statement.");
  }
}

function hashSqlShape(query: Prisma.Sql): string {
  const shape = query.text
    .replace(/\$\d+/g, "$?")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(shape).digest("hex");
}

async function getProductionModules() {
  const [prismaModule, eventActivity, trend, comparison, commerce, session, shopper, product] =
    await Promise.all([
      import("../../src/config/prisma"),
      import("../../src/analytics/eventActivity"),
      import("../../src/analytics/trend"),
      import("../../src/analytics/comparison"),
      import("../../src/analytics/commerceFunnel"),
      import("../../src/analytics/sessionFunnel"),
      import("../../src/analytics/shopperSummary"),
      import("../../src/analytics/productPerformance"),
    ]);

  productionPrisma = prismaModule.prisma as unknown as QueryRawHolder;
  return { eventActivity, trend, comparison, commerce, session, shopper, product };
}

async function captureQueries(operation: () => Promise<unknown>): Promise<Prisma.Sql[]> {
  if (captureInProgress) {
    throw new Error("Analytics SQL capture must run sequentially.");
  }
  if (!productionPrisma) {
    throw new Error("Production Prisma client was not initialized for SQL capture.");
  }

  captureInProgress = true;
  const original = productionPrisma.$queryRaw;
  const captured: Prisma.Sql[] = [];

  productionPrisma.$queryRaw = async (query, ...values) => {
    const sql = toSql(query, values);
    assertReadOnlySelect(sql);
    captured.push(sql);
    return [];
  };

  try {
    await operation();
    return captured;
  } finally {
    productionPrisma.$queryRaw = original;
    captureInProgress = false;
  }
}

function oneQuery(queries: Prisma.Sql[], description: string): Prisma.Sql {
  if (queries.length !== 1 || !queries[0]) {
    throw new Error(
      `${description} should emit exactly one SQL statement; captured ${queries.length}.`,
    );
  }
  return queries[0];
}

function eventActivityQuery(
  queries: Prisma.Sql[],
  queryId: AnalyticsQueryId,
  projectScoped: boolean,
): Prisma.Sql {
  const expectedIds: AnalyticsQueryId[] = projectScoped
    ? [1, 2, 3, 4, 5, 6, 7, 8]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  if (queries.length !== expectedIds.length) {
    throw new Error(
      `eventActivity should emit ${expectedIds.length} SQL statements for this scope; ` +
        `captured ${queries.length}.`,
    );
  }
  const index = expectedIds.indexOf(queryId);
  const query = index >= 0 ? queries[index] : undefined;
  if (!query) {
    throw new Error(`Query #${queryId} is not emitted for this eventActivity scope.`);
  }
  return query;
}

export function getQueryDefinition(queryId: AnalyticsQueryId) {
  const definition = ANALYTICS_QUERY_REGISTRY.find((query) => query.id === queryId);
  if (!definition) throw new Error(`Unknown analytics query #${queryId}.`);
  return definition;
}

export async function captureProductionQuery(input: {
  target: ExplainTarget;
  scope: AnalyticsScope;
}): Promise<CapturedQuery> {
  const modules = await getProductionModules();
  const { queryId } = input.target;
  let sql: Prisma.Sql;

  if (queryId >= 1 && queryId <= 9) {
    const queries = await captureQueries(() =>
      modules.eventActivity.fetchEventActivity(input.scope),
    );
    sql = eventActivityQuery(queries, queryId, Boolean(input.scope.projectId));
  } else if (queryId === 10) {
    sql = oneQuery(
      await captureQueries(() => modules.trend.fetchTrendSpanDays(input.scope)),
      "trend span",
    );
  } else if (queryId >= 11 && queryId <= 13) {
    sql = oneQuery(
      await captureQueries(() =>
        modules.trend.fetchTrend(
          input.scope,
          queryId === 13 ? input.target.allTimeGranularity : null,
        ),
      ),
      `trend query #${queryId}`,
    );
  } else if (queryId === 14) {
    sql = oneQuery(
      await captureQueries(() => modules.comparison.fetchPeriodComparison(input.scope)),
      "period comparison",
    );
  } else if (queryId === 15) {
    sql = oneQuery(
      await captureQueries(() => modules.commerce.fetchCommerceCounts(input.scope)),
      "commerce funnel",
    );
  } else if (queryId === 16) {
    sql = oneQuery(
      await captureQueries(() => modules.session.fetchSessionFunnel(input.scope)),
      "session funnel",
    );
  } else if (queryId === 17) {
    sql = oneQuery(
      await captureQueries(() => modules.shopper.fetchShopperSummary(input.scope)),
      "shopper summary",
    );
  } else if (queryId === 18) {
    sql = oneQuery(
      await captureQueries(() =>
        modules.product.fetchProductPerformanceRows(input.scope),
      ),
      "product performance",
    );
  } else {
    sql = oneQuery(
      await captureQueries(() =>
        modules.product.fetchCategoryPerformanceRows(input.scope),
      ),
      "category performance",
    );
  }

  assertReadOnlySelect(sql);
  return {
    text: sql.text,
    values: sql.values,
    shapeHash: hashSqlShape(sql),
  };
}

export async function closeQueryRegistry(): Promise<void> {
  if (productionPrisma) {
    await productionPrisma.$disconnect();
    productionPrisma = null;
  }
}
