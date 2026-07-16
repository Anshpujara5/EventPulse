import "dotenv/config";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { createAnalyticsScope } from "../../src/analytics/analyticsScope";
import type {
  BenchmarkEnvironmentMetadata,
  BenchmarkProjectScope,
  BenchmarkRange,
  BenchmarkRunResult,
  BenchmarkStatistics,
  BenchmarkTableCounts,
  BenchmarkTier,
} from "./benchmark-types";
import {
  calculateStatistics,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_OUTPUT_DIRECTORY,
  loadBenchmarkManifest,
  REPOSITORY_ROOT,
  resolveCustomDates,
} from "./benchmark-utils";
import {
  ANALYTICS_QUERY_REGISTRY,
  captureProductionQuery,
  closeQueryRegistry,
} from "./explain-query-registry";
import {
  ANALYTICS_QUERY_IDS,
  type AnalyticsQueryId,
  type CuratedAnalyticsBaseline,
  type CuratedExplainTarget,
  type ExplainPlanHash,
  type ExplainPlanScan,
  type ExplainPlanSort,
  type ExplainPlanSummary,
  type ExplainRunResult,
  type ExplainSample,
  type ExplainTarget,
  type ExplainTargetResult,
} from "./explain-types";
import {
  assertBenchmarkEnvironment,
  BENCHMARK_TENANT_EMAILS,
} from "./guard";

const execFileAsync = promisify(execFile);
const MAX_ANCHOR_DRIFT_HOURS = 6;
const DEFAULT_EXPLAIN_OUTPUT_DIRECTORY = DEFAULT_OUTPUT_DIRECTORY;
const DEFAULT_BASELINE_DIRECTORY = path.join(
  REPOSITORY_ROOT,
  "benchmarks/baselines/analytics",
);
const DEFAULT_RANGES: BenchmarkRange[] = [
  "24h",
  "7d",
  "30d",
  "custom-long",
  "all",
];
const DEFAULT_SCOPES: BenchmarkProjectScope[] = ["all", "single"];
const MAX_REPETITIONS = 20;

interface ExplainCliOptions {
  help: boolean;
  dryRun: boolean;
  tier: BenchmarkTier | null;
  queryIds: AnalyticsQueryId[];
  projectScopes: BenchmarkProjectScope[];
  ranges: BenchmarkRange[];
  primingRuns: number;
  measuredRuns: number;
  outputDirectory: string;
  runId: string | null;
  httpResultPath: string | null;
  baselineId: string | null;
  baselineDirectory: string;
  hasExplicitTargetFilters: boolean;
}

interface CountRow {
  users: number | string;
  projects: number | string;
  apiKeys: number | string;
  events: number | string;
  alerts: number | string;
  alertTriggers: number | string;
}

interface PostgresMetadataRow {
  databaseName: string;
  version: string;
  serverVersion: string;
  timezone: string;
  sharedBuffers: string;
  workMem: string;
  effectiveCacheSize: string;
  jit: string;
}

interface BenchmarkIdentityRow {
  userId: string;
  projectId: string;
  projectName: string;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionValue(args: string[], index: number, name: string) {
  const argument = args[index] ?? "";
  if (argument.startsWith(`${name}=`)) {
    const value = argument.slice(name.length + 1);
    if (!value) throw new Error(`${name} requires a value.`);
    return { value, consumed: 1 };
  }
  if (argument === name) {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    return { value, consumed: 2 };
  }
  return null;
}

function parseInteger(name: string, value: string, minimum: number): number {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an integer.`);
  const parsed = Number(value);
  if (parsed < minimum || parsed > MAX_REPETITIONS) {
    throw new Error(`${name} must be between ${minimum} and ${MAX_REPETITIONS}.`);
  }
  return parsed;
}

function parseStringList<T extends string>(input: {
  name: string;
  value: string;
  allowed: readonly T[];
}): T[] {
  const requested = input.value
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (requested.length === 0) throw new Error(`${input.name} requires values.`);
  const invalid = requested.filter(
    (value): value is string => !input.allowed.includes(value as T),
  );
  if (invalid.length > 0) {
    throw new Error(
      `${input.name} contains unsupported value(s): ${invalid.join(", ")}. ` +
        `Allowed: ${input.allowed.join(", ")}.`,
    );
  }
  const selected = new Set(requested);
  return input.allowed.filter((value) => selected.has(value));
}

function parseQueryIds(value: string): AnalyticsQueryId[] {
  if (value === "all") return [...ANALYTICS_QUERY_IDS];
  const requested = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (requested.length === 0) throw new Error("--queries requires values.");

  const parsed = requested.map((entry) => {
    if (!/^\d+$/.test(entry)) throw new Error(`Invalid query id: ${entry}.`);
    const queryId = Number(entry);
    if (!ANALYTICS_QUERY_IDS.includes(queryId as AnalyticsQueryId)) {
      throw new Error(`Unknown analytics query id: ${entry}.`);
    }
    return queryId as AnalyticsQueryId;
  });
  return ANALYTICS_QUERY_IDS.filter((queryId) => parsed.includes(queryId));
}

function safeId(value: string, name: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(value)) {
    throw new Error(
      `${name} must be 1-120 characters using letters, numbers, dot, underscore, or hyphen.`,
    );
  }
  return value;
}

function resolvePath(value: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(REPOSITORY_ROOT, value);
}

function parseExplainCli(args: string[]): ExplainCliOptions {
  let help = false;
  let dryRun = false;
  let tier: BenchmarkTier | null = null;
  let queryIds = [...ANALYTICS_QUERY_IDS];
  let projectScopes = [...DEFAULT_SCOPES];
  let ranges = [...DEFAULT_RANGES];
  let primingRuns = 1;
  let measuredRuns = 5;
  let outputDirectory = DEFAULT_EXPLAIN_OUTPUT_DIRECTORY;
  let runId: string | null = null;
  let httpResultPath: string | null = null;
  let baselineId: string | null = null;
  let baselineDirectory = DEFAULT_BASELINE_DIRECTORY;
  let hasExplicitTargetFilters = false;

  for (let index = 0; index < args.length; ) {
    const argument = args[index];
    if (argument === "--") {
      index += 1;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      help = true;
      index += 1;
      continue;
    }
    if (argument === "--dry-run") {
      dryRun = true;
      index += 1;
      continue;
    }

    const tierOption = readOptionValue(args, index, "--tier");
    if (tierOption) {
      if (!(["small", "medium", "large"] as const).includes(tierOption.value as BenchmarkTier)) {
        throw new Error("--tier must be small, medium, or large.");
      }
      tier = tierOption.value as BenchmarkTier;
      index += tierOption.consumed;
      continue;
    }
    const queryOption = readOptionValue(args, index, "--queries");
    if (queryOption) {
      queryIds = parseQueryIds(queryOption.value);
      hasExplicitTargetFilters = true;
      index += queryOption.consumed;
      continue;
    }
    const projectOption = readOptionValue(args, index, "--projects");
    if (projectOption) {
      projectScopes = parseStringList({
        name: "--projects",
        value: projectOption.value,
        allowed: ["all", "single"] as const,
      });
      hasExplicitTargetFilters = true;
      index += projectOption.consumed;
      continue;
    }
    const rangeOption = readOptionValue(args, index, "--ranges");
    if (rangeOption) {
      ranges = parseStringList({
        name: "--ranges",
        value: rangeOption.value,
        allowed: DEFAULT_RANGES,
      });
      hasExplicitTargetFilters = true;
      index += rangeOption.consumed;
      continue;
    }
    const primingOption = readOptionValue(args, index, "--warmups");
    if (primingOption) {
      primingRuns = parseInteger("--warmups", primingOption.value, 1);
      index += primingOption.consumed;
      continue;
    }
    const runsOption = readOptionValue(args, index, "--runs");
    if (runsOption) {
      measuredRuns = parseInteger("--runs", runsOption.value, 2);
      index += runsOption.consumed;
      continue;
    }
    const outputOption = readOptionValue(args, index, "--output-dir");
    if (outputOption) {
      outputDirectory = resolvePath(outputOption.value);
      index += outputOption.consumed;
      continue;
    }
    const runIdOption = readOptionValue(args, index, "--run-id");
    if (runIdOption) {
      runId = safeId(runIdOption.value, "--run-id");
      index += runIdOption.consumed;
      continue;
    }
    const httpOption = readOptionValue(args, index, "--http-result");
    if (httpOption) {
      httpResultPath = resolvePath(httpOption.value);
      index += httpOption.consumed;
      continue;
    }
    const baselineIdOption = readOptionValue(args, index, "--baseline-id");
    if (baselineIdOption) {
      baselineId = safeId(baselineIdOption.value, "--baseline-id");
      index += baselineIdOption.consumed;
      continue;
    }
    const baselineDirOption = readOptionValue(args, index, "--baseline-dir");
    if (baselineDirOption) {
      baselineDirectory = resolvePath(baselineDirOption.value);
      index += baselineDirOption.consumed;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!help && tier === null) {
    throw new Error("--tier=small|medium|large is required.");
  }
  if ((baselineId && !httpResultPath) || (!baselineId && httpResultPath)) {
    throw new Error("--baseline-id and --http-result must be supplied together.");
  }
  if (baselineId && tier !== "medium") {
    throw new Error("Curated baselines can only be produced from the medium tier.");
  }
  if (baselineId && hasExplicitTargetFilters) {
    throw new Error("A curated baseline requires the complete default medium EXPLAIN matrix.");
  }

  return {
    help,
    dryRun,
    tier,
    queryIds,
    projectScopes,
    ranges,
    primingRuns,
    measuredRuns,
    outputDirectory,
    runId,
    httpResultPath,
    baselineId,
    baselineDirectory,
    hasExplicitTargetFilters,
  };
}

function explainHelp(): string {
  return `EventPulse analytics EXPLAIN harness

Usage:
  bun run bench:explain -- --tier=<small|medium|large> [options]

Options:
  --tier VALUE          Dataset tier; must match the manifest (required)
  --queries LIST        Query ids 1..19, comma-separated, or all
  --projects LIST       all,single
  --ranges LIST         24h,7d,30d,custom-long,all
  --warmups N           Priming EXPLAIN plans (default: 1; minimum: 1)
  --runs N              Measured EXPLAIN plans (default: 5; minimum: 2)
  --output-dir PATH     Raw JSON/Markdown output directory
  --run-id ID           Safe raw-output basename
  --http-result PATH    Complete medium HTTP benchmark JSON to curate
  --baseline-id ID      Curated baseline id (requires --http-result)
  --baseline-dir PATH   Curated output directory
  --dry-run             Validate guard/manifest and print targets only
  --help, -h            Show this help

Safety:
  BENCHMARK_DATABASE_URL is required and its database name must contain "bench".
  Every EXPLAIN runs as EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) inside
  BEGIN READ ONLY and is always followed by ROLLBACK.

Defaults:
  Medium covers all 19 production SQL statements and their material scope/range
  variants. Small defaults to the all-time day-granularity trend target only.
  Large is available for explicit targeted runs but is not run automatically.`;
}

function buildExplainTargets(options: ExplainCliOptions): ExplainTarget[] {
  if (!options.tier) return [];
  const selectedQueryIds =
    options.tier === "small" && !options.hasExplicitTargetFilters
      ? ([13] as AnalyticsQueryId[])
      : options.queryIds;
  const targets: ExplainTarget[] = [];

  for (const definition of ANALYTICS_QUERY_REGISTRY) {
    if (!selectedQueryIds.includes(definition.id)) continue;
    for (const projectScope of options.projectScopes) {
      if (!definition.supportedScopes.includes(projectScope)) continue;
      for (const range of options.ranges) {
        if (!definition.supportedRanges.includes(range)) continue;
        const allTimeGranularity =
          definition.id === 13
            ? options.tier === "small"
              ? "day"
              : "month"
            : null;
        targets.push({
          id:
            `q${String(definition.id).padStart(2, "0")}-${definition.key}:` +
            `${projectScope}:${range}` +
            (allTimeGranularity ? `:${allTimeGranularity}` : ""),
          queryId: definition.id,
          projectScope,
          range,
          allTimeGranularity,
        });
      }
    }
  }

  if (targets.length === 0) {
    throw new Error("The selected query/scope/range filters produce no EXPLAIN targets.");
  }
  return targets;
}

function numberField(record: JsonRecord, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringField(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function sanitizePlanExpression(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/'[^']*'/g, "'[VALUE]'").slice(0, 500);
}

function stringArrayField(record: JsonRecord, key: string): string[] {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

interface TraversedNode {
  record: JsonRecord;
  depth: number;
  label: string;
  weightedTime: number;
}

function traversePlan(root: JsonRecord): TraversedNode[] {
  const traversed: TraversedNode[] = [];
  const visit = (record: JsonRecord, depth: number) => {
    const nodeType = stringField(record, "Node Type") ?? "Unknown";
    const relation = stringField(record, "Relation Name");
    const index = stringField(record, "Index Name");
    const label = [nodeType, relation ? `on ${relation}` : null, index ? `using ${index}` : null]
      .filter(Boolean)
      .join(" ");
    const actualTime = numberField(record, "Actual Total Time") ?? 0;
    const loops = numberField(record, "Actual Loops") ?? 1;
    traversed.push({ record, depth, label, weightedTime: actualTime * loops });
    const children = record.Plans;
    if (Array.isArray(children)) {
      for (const child of children) {
        if (isRecord(child)) visit(child, depth + 1);
      }
    }
  };
  visit(root, 0);
  return traversed;
}

function parseExplainDocument(value: unknown): {
  document: JsonRecord;
  summary: ExplainPlanSummary;
} {
  let parsed = value;
  if (typeof parsed === "string") parsed = JSON.parse(parsed) as unknown;
  if (!Array.isArray(parsed) || !isRecord(parsed[0])) {
    throw new Error("PostgreSQL returned an unsupported FORMAT JSON payload.");
  }
  const document = parsed[0];
  if (!isRecord(document.Plan)) {
    throw new Error("PostgreSQL EXPLAIN JSON is missing the root Plan object.");
  }
  const root = document.Plan;
  const nodes = traversePlan(root);
  const nodeTypes: Record<string, number> = {};
  const scans: ExplainPlanScan[] = [];
  const sorts: ExplainPlanSort[] = [];
  const hashes: ExplainPlanHash[] = [];
  let rowsRemovedByFilter = 0;

  for (const node of nodes) {
    const nodeType = stringField(node.record, "Node Type") ?? "Unknown";
    nodeTypes[nodeType] = (nodeTypes[nodeType] ?? 0) + 1;
    rowsRemovedByFilter += numberField(node.record, "Rows Removed by Filter") ?? 0;
    if (nodeType.includes("Scan")) {
      scans.push({
        nodeType,
        relationName: stringField(node.record, "Relation Name"),
        alias: stringField(node.record, "Alias"),
        indexName: stringField(node.record, "Index Name"),
        actualRows: numberField(node.record, "Actual Rows"),
        actualLoops: numberField(node.record, "Actual Loops"),
        rowsRemovedByFilter:
          numberField(node.record, "Rows Removed by Filter") ?? 0,
        filter: sanitizePlanExpression(stringField(node.record, "Filter")),
        indexCondition: sanitizePlanExpression(
          stringField(node.record, "Index Cond") ??
            stringField(node.record, "Recheck Cond"),
        ),
      });
    }
    if (nodeType === "Sort" || stringField(node.record, "Sort Method")) {
      sorts.push({
        method: stringField(node.record, "Sort Method"),
        spaceUsedKb: numberField(node.record, "Sort Space Used"),
        spaceType: stringField(node.record, "Sort Space Type"),
        sortKeys: stringArrayField(node.record, "Sort Key"),
      });
    }
    if (nodeType === "Hash") {
      hashes.push({
        buckets: numberField(node.record, "Hash Buckets"),
        batches: numberField(node.record, "Hash Batches"),
        originalBatches: numberField(node.record, "Original Hash Batches"),
        peakMemoryKb: numberField(node.record, "Peak Memory Usage"),
      });
    }
  }

  const shape = nodes
    .map((node) => {
      const type = stringField(node.record, "Node Type") ?? "Unknown";
      const relation = stringField(node.record, "Relation Name") ?? "";
      const index = stringField(node.record, "Index Name") ?? "";
      return `${node.depth}:${type}:${relation}:${index}`;
    })
    .join("|");
  const dominantCandidates = nodes.filter((node) => node.depth > 0);
  const dominant = (dominantCandidates.length > 0 ? dominantCandidates : nodes).reduce(
    (best, node) => (node.weightedTime > best.weightedTime ? node : best),
  );

  return {
    document,
    summary: {
      planningMs: numberField(document, "Planning Time") ?? 0,
      executionMs: numberField(document, "Execution Time") ?? 0,
      totalCost: numberField(root, "Total Cost"),
      actualRows: numberField(root, "Actual Rows"),
      actualLoops: numberField(root, "Actual Loops"),
      planRows: numberField(root, "Plan Rows"),
      nodeTypes,
      planShapeHash: createHash("sha256").update(shape).digest("hex"),
      dominantNode: dominant.label,
      sequentialScanCount: nodeTypes["Seq Scan"] ?? 0,
      indexScanCount:
        (nodeTypes["Index Scan"] ?? 0) + (nodeTypes["Index Only Scan"] ?? 0),
      bitmapScanCount:
        (nodeTypes["Bitmap Heap Scan"] ?? 0) +
        (nodeTypes["Bitmap Index Scan"] ?? 0),
      nestedLoopCount: nodeTypes["Nested Loop"] ?? 0,
      rowsRemovedByFilter,
      buffers: {
        sharedHit: numberField(root, "Shared Hit Blocks") ?? 0,
        sharedRead: numberField(root, "Shared Read Blocks") ?? 0,
        sharedDirtied: numberField(root, "Shared Dirtied Blocks") ?? 0,
        sharedWritten: numberField(root, "Shared Written Blocks") ?? 0,
        tempRead: numberField(root, "Temp Read Blocks") ?? 0,
        tempWritten: numberField(root, "Temp Written Blocks") ?? 0,
      },
      scans,
      sorts,
      hashes,
    },
  };
}

async function runExplainSample(input: {
  pool: Pool;
  queryText: string;
  values: readonly unknown[];
  phase: ExplainSample["phase"];
  iteration: number;
}): Promise<ExplainSample> {
  const client = await input.pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN READ ONLY");
    transactionOpen = true;
    const readOnly = await client.query<{ transaction_read_only: string }>(
      "SHOW transaction_read_only",
    );
    if (readOnly.rows[0]?.transaction_read_only !== "on") {
      throw new Error("PostgreSQL did not enter a read-only transaction.");
    }
    const result = await client.query<{ "QUERY PLAN": unknown }>({
      text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${input.queryText}`,
      values: [...input.values],
    });
    const payload = result.rows[0]?.["QUERY PLAN"];
    const parsed = parseExplainDocument(payload);
    await client.query("ROLLBACK");
    transactionOpen = false;
    return {
      phase: input.phase,
      iteration: input.iteration,
      summary: parsed.summary,
      planJson: parsed.document,
    };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original EXPLAIN failure.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

function requireStatistics(values: number[], label: string): BenchmarkStatistics {
  const statistics = calculateStatistics(values);
  if (!statistics) throw new Error(`No measured values were captured for ${label}.`);
  return statistics;
}

function representativeSample(samples: ExplainSample[], median: number): ExplainSample {
  const first = samples[0];
  if (!first) throw new Error("No measured EXPLAIN sample is available.");
  return samples.reduce((closest, sample) =>
    Math.abs(sample.summary.executionMs - median) <
    Math.abs(closest.summary.executionMs - median)
      ? sample
      : closest,
  );
}

async function runExplainTarget(input: {
  pool: Pool;
  target: ExplainTarget;
  scope: ReturnType<typeof createAnalyticsScope> & { valid: true };
  customDates: { from: string; to: string } | null;
  primingRuns: number;
  measuredRuns: number;
}): Promise<ExplainTargetResult> {
  const query = await captureProductionQuery({
    target: input.target,
    scope: input.scope.value,
  });
  const primingSamples: ExplainSample[] = [];
  const measuredSamples: ExplainSample[] = [];

  for (let iteration = 1; iteration <= input.primingRuns; iteration += 1) {
    primingSamples.push(
      await runExplainSample({
        pool: input.pool,
        queryText: query.text,
        values: query.values,
        phase: "priming",
        iteration,
      }),
    );
  }
  for (let iteration = 1; iteration <= input.measuredRuns; iteration += 1) {
    measuredSamples.push(
      await runExplainSample({
        pool: input.pool,
        queryText: query.text,
        values: query.values,
        phase: "measured",
        iteration,
      }),
    );
  }

  const planningMs = requireStatistics(
    measuredSamples.map((sample) => sample.summary.planningMs),
    `${input.target.id} planning time`,
  );
  const executionMs = requireStatistics(
    measuredSamples.map((sample) => sample.summary.executionMs),
    `${input.target.id} execution time`,
  );
  const representative = representativeSample(measuredSamples, executionMs.median);
  const definition = ANALYTICS_QUERY_REGISTRY.find(
    (candidate) => candidate.id === input.target.queryId,
  );
  if (!definition) throw new Error(`Missing registry entry for query #${input.target.queryId}.`);

  return {
    ...input.target,
    query: definition,
    customDates: input.customDates,
    sqlShapeHash: query.shapeHash,
    sqlCapture: "production-prisma-template",
    primingSamples,
    measuredSamples,
    planningMs,
    executionMs,
    bufferStatistics: {
      sharedHit: requireStatistics(
        measuredSamples.map((sample) => sample.summary.buffers.sharedHit),
        `${input.target.id} shared-hit blocks`,
      ),
      sharedRead: requireStatistics(
        measuredSamples.map((sample) => sample.summary.buffers.sharedRead),
        `${input.target.id} shared-read blocks`,
      ),
      tempRead: requireStatistics(
        measuredSamples.map((sample) => sample.summary.buffers.tempRead),
        `${input.target.id} temp-read blocks`,
      ),
      tempWritten: requireStatistics(
        measuredSamples.map((sample) => sample.summary.buffers.tempWritten),
        `${input.target.id} temp-written blocks`,
      ),
    },
    representativePlan: representative.summary,
  };
}

async function benchmarkCounts(pool: Pool): Promise<BenchmarkTableCounts> {
  const { rows } = await pool.query<CountRow>(
    `WITH benchmark_users AS (
       SELECT id FROM "User" WHERE email = ANY($1::text[])
     ), benchmark_alerts AS (
       SELECT id FROM "Alert" WHERE "userId" IN (SELECT id FROM benchmark_users)
     )
     SELECT
       (SELECT COUNT(*)::int FROM benchmark_users) AS users,
       (SELECT COUNT(*)::int FROM "Project" WHERE "userId" IN (SELECT id FROM benchmark_users)) AS projects,
       (SELECT COUNT(*)::int FROM "ApiKey" WHERE "userId" IN (SELECT id FROM benchmark_users)) AS "apiKeys",
       (SELECT COUNT(*)::int FROM "Event" WHERE "userId" IN (SELECT id FROM benchmark_users)) AS events,
       (SELECT COUNT(*)::int FROM benchmark_alerts) AS alerts,
       (SELECT COUNT(*)::int FROM "AlertTrigger" WHERE "alertId" IN (SELECT id FROM benchmark_alerts)) AS "alertTriggers"`,
    [[...BENCHMARK_TENANT_EMAILS]],
  );
  const row = rows[0];
  if (!row) throw new Error("Could not count benchmark tenant rows.");
  return {
    users: Number(row.users),
    projects: Number(row.projects),
    apiKeys: Number(row.apiKeys),
    events: Number(row.events),
    alerts: Number(row.alerts),
    alertTriggers: Number(row.alertTriggers),
  };
}

function countsEqual(left: BenchmarkTableCounts, right: BenchmarkTableCounts): boolean {
  return (Object.keys(left) as (keyof BenchmarkTableCounts)[]).every(
    (key) => left[key] === right[key],
  );
}

function assertExpectedCounts(
  expected: BenchmarkTableCounts,
  actual: BenchmarkTableCounts,
): void {
  for (const key of Object.keys(expected) as (keyof BenchmarkTableCounts)[]) {
    if (expected[key] !== actual[key]) {
      throw new Error(
        `Benchmark database count mismatch for ${key}: expected ${expected[key]}, ` +
          `found ${actual[key]}. Reseed explicitly before EXPLAIN.`,
      );
    }
  }
}

async function benchmarkIdentity(pool: Pool, tier: BenchmarkTier) {
  const { rows } = await pool.query<BenchmarkIdentityRow>(
    `SELECT u.id AS "userId", p.id AS "projectId", p.name AS "projectName"
     FROM "User" u
     JOIN "Project" p ON p."userId" = u.id
     WHERE u.email = $1 AND p.id = $2`,
    [BENCHMARK_TENANT_EMAILS[0], `bench-project-primary-${tier}-1`],
  );
  const row = rows[0];
  if (!row || row.projectName !== "bench-canary") {
    throw new Error("Could not verify the benchmark tenant and bench-canary project.");
  }
  return row;
}

async function postgresMetadata(pool: Pool) {
  const { rows } = await pool.query<PostgresMetadataRow>(`
    SELECT
      current_database() AS "databaseName",
      version() AS version,
      current_setting('server_version') AS "serverVersion",
      current_setting('TimeZone') AS timezone,
      current_setting('shared_buffers') AS "sharedBuffers",
      current_setting('work_mem') AS "workMem",
      current_setting('effective_cache_size') AS "effectiveCacheSize",
      current_setting('jit') AS jit
  `);
  const row = rows[0];
  if (!row) throw new Error("Could not collect PostgreSQL metadata.");
  return row;
}

async function optionalCommand(command: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(command, args, { cwd: REPOSITORY_ROOT });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function gitMetadata() {
  const [commitSha, branch, status] = await Promise.all([
    optionalCommand("git", ["rev-parse", "HEAD"]),
    optionalCommand("git", ["branch", "--show-current"]),
    optionalCommand("git", ["status", "--porcelain"]),
  ]);
  if (!commitSha || !branch) throw new Error("Could not collect Git metadata.");
  return { commitSha, branch, dirty: Boolean(status) };
}

async function environmentMetadata(pool: Pool): Promise<BenchmarkEnvironmentMetadata> {
  const [nodeCommandVersion, postgres] = await Promise.all([
    optionalCommand("node", ["--version"]),
    postgresMetadata(pool),
  ]);
  const cpus = os.cpus();
  return {
    runtime: {
      bunVersion: process.versions.bun ?? "unavailable",
      nodeCompatibilityVersion: process.version,
      nodeCommandVersion,
    },
    operatingSystem: {
      platform: os.platform(),
      release: os.release(),
      architecture: os.arch(),
      cpuModel: cpus[0]?.model ?? null,
      logicalCpuCount: cpus.length,
      totalMemoryBytes: os.totalmem(),
    },
    postgres,
  };
}

function createRunId(timestamp: string, commitSha: string, tier: string): string {
  return `${timestamp.replace(/[:.]/g, "-")}-${commitSha.slice(0, 8)}-explain-${tier}`;
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(3);
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderExplainMarkdown(result: ExplainRunResult): string {
  const lines = [
    `# EventPulse Analytics EXPLAIN: ${result.runId}`,
    "",
    "> Measurement only. No query, index, schema, or pool changes are included.",
    "",
    "## Environment",
    "",
    `- Git: \`${result.git.commitSha}\` (${result.git.branch}), dirty: ${result.git.dirty ? "yes" : "no"}`,
    `- Dataset: ${result.dataset.tier} / \`${result.dataset.manifestHash}\``,
    `- Anchor drift: ${result.dataset.anchorDriftHours.toFixed(3)} hours`,
    `- PostgreSQL: ${markdownCell(result.environment.postgres.serverVersion)}`,
    `- work_mem: ${result.environment.postgres.workMem}; shared_buffers: ${result.environment.postgres.sharedBuffers}`,
    "- SQL source: exact parameterized Prisma templates captured from production fetch functions.",
    "- Safety: each plan ran in BEGIN READ ONLY and ended with ROLLBACK.",
    "",
    "## Plan Summary",
    "",
    "| Target | Query | Exec median | Exec p95 | Plan median | Shared hit | Shared read | Seq scans | Index scans | Temp written | Dominant node |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|",
    ...result.targets.map(
      (target) =>
        `| ${markdownCell(target.id)} | #${target.queryId} ${markdownCell(target.query.label)} | ` +
        `${formatNumber(target.executionMs.median)} | ${formatNumber(target.executionMs.p95)} | ` +
        `${formatNumber(target.planningMs.median)} | ${formatNumber(target.bufferStatistics.sharedHit.median)} | ` +
        `${formatNumber(target.bufferStatistics.sharedRead.median)} | ` +
        `${target.representativePlan.sequentialScanCount} | ${target.representativePlan.indexScanCount} | ` +
        `${formatNumber(target.bufferStatistics.tempWritten.median)} | ` +
        `${markdownCell(target.representativePlan.dominantNode)} |`,
    ),
    "",
    "## Coverage",
    "",
    `- Targets: ${result.summary.totalTargets}`,
    `- Queries: ${result.summary.queriesCovered.join(", ")}`,
    `- Priming plans: ${result.summary.totalPrimingPlans}`,
    `- Measured plans: ${result.summary.totalMeasuredPlans}`,
    `- Benchmark tenant counts unchanged: ${result.dataset.databaseUnchanged ? "yes" : "NO"}`,
    "",
    "## Warnings",
    "",
    ...(result.warnings.length > 0
      ? result.warnings.map((warning) => `- ${markdownCell(warning)}`)
      : ["- None."]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function writeExplainResult(result: ExplainRunResult, outputDirectory: string) {
  await mkdir(outputDirectory, { recursive: true });
  const jsonPath = path.join(outputDirectory, `${result.runId}.json`);
  const markdownPath = path.join(outputDirectory, `${result.runId}.md`);
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, renderExplainMarkdown(result), "utf8"),
  ]);
  return { jsonPath, markdownPath };
}

function validateHttpRun(value: unknown): BenchmarkRunResult {
  if (
    !isRecord(value) ||
    value.schemaVersion !== "1.0.0" ||
    typeof value.runId !== "string" ||
    !isRecord(value.git) ||
    !isRecord(value.environment) ||
    !isRecord(value.dataset) ||
    !isRecord(value.configuration) ||
    !Array.isArray(value.contractCanaries) ||
    !Array.isArray(value.cells) ||
    !isRecord(value.summary) ||
    !Array.isArray(value.warnings)
  ) {
    throw new Error("The HTTP benchmark result has an unsupported shape.");
  }
  return value as unknown as BenchmarkRunResult;
}

async function loadHttpResult(filePath: string): Promise<BenchmarkRunResult> {
  const source = await readFile(filePath, "utf8");
  return validateHttpRun(JSON.parse(source) as unknown);
}

const TAB_BUDGETS: CuratedAnalyticsBaseline["provisionalBudgets"]["tab"] = {
  overview: { medianMs: 250, p95Ms: 500 },
  conversion: { medianMs: 120, p95Ms: 250 },
  products: { medianMs: 400, p95Ms: 800 },
  shoppers: { medianMs: 60, p95Ms: 120 },
  behavior: { medianMs: 200, p95Ms: 400 },
};

function curateExplainTarget(target: ExplainTargetResult): CuratedExplainTarget {
  return {
    id: target.id,
    queryId: target.queryId,
    queryKey: target.query.key,
    module: target.query.module,
    label: target.query.label,
    tabs: target.query.tabs,
    source: target.query.source,
    projectScope: target.projectScope,
    range: target.range,
    allTimeGranularity: target.allTimeGranularity,
    sqlShapeHash: target.sqlShapeHash,
    planningMs: target.planningMs,
    executionMs: target.executionMs,
    bufferStatistics: target.bufferStatistics,
    representativePlan: target.representativePlan,
  };
}

function buildCuratedBaseline(input: {
  baselineId: string;
  http: BenchmarkRunResult;
  explain: ExplainRunResult;
}): CuratedAnalyticsBaseline {
  if (input.http.dataset.tier !== "medium" || input.explain.dataset.tier !== "medium") {
    throw new Error("A curated baseline requires medium HTTP and EXPLAIN runs.");
  }
  if (input.http.dataset.manifestHash !== input.explain.dataset.manifestHash) {
    throw new Error("HTTP and EXPLAIN manifest hashes do not match.");
  }
  if (!input.http.dataset.databaseUnchanged || !input.explain.dataset.databaseUnchanged) {
    throw new Error("Cannot curate a run whose benchmark tenant counts changed.");
  }
  if (input.http.summary.failedCells > 0 || input.http.cells.length !== 50) {
    throw new Error("The curated HTTP baseline must contain 50 passing medium cells.");
  }
  if (input.explain.summary.queriesCovered.length !== 19) {
    throw new Error("The curated EXPLAIN baseline must cover all 19 queries.");
  }

  return {
    schemaVersion: "1.0.0",
    baselineId: input.baselineId,
    createdAt: new Date().toISOString(),
    measurementOnly: true,
    git: input.explain.git,
    environment: input.explain.environment,
    dataset: {
      tier: "medium",
      seed: input.explain.dataset.seed,
      manifestHash: input.explain.dataset.manifestHash,
      anchor: input.explain.dataset.anchor,
      dateSpreadDays: input.explain.dataset.dateSpreadDays,
      expectedTables: input.explain.dataset.expectedTables,
      httpCountsBefore: input.http.dataset.countsBefore,
      httpCountsAfter: input.http.dataset.countsAfter,
      explainCountsBefore: input.explain.dataset.countsBefore,
      explainCountsAfter: input.explain.dataset.countsAfter,
      databaseUnchanged:
        input.http.dataset.databaseUnchanged && input.explain.dataset.databaseUnchanged,
    },
    http: {
      sourceRunId: input.http.runId,
      configuration: input.http.configuration,
      contractCanaries: input.http.contractCanaries,
      cells: input.http.cells.map((cell) => ({
        id: cell.id,
        tab: cell.tab,
        projectScope: cell.projectScope,
        range: cell.range,
        firstRunDurationMs: cell.firstRunDurationMs,
        latencyMs: cell.latencyMs,
        payloadBytes: cell.payloadBytes,
        statusCounts: cell.statusCounts,
        correctnessPassed: cell.correctness.passed,
        failed: cell.failed,
      })),
      summary: input.http.summary,
      warnings: input.http.warnings,
    },
    explain: {
      sourceRunId: input.explain.runId,
      configuration: input.explain.configuration,
      targets: input.explain.targets.map(curateExplainTarget),
      warnings: input.explain.warnings,
    },
    provisionalBudgets: {
      tab: TAB_BUDGETS,
      singleQueryP95Ms: 300,
      payloadBytes: 50 * 1_024,
    },
    knownLimitations: [
      "Local workstation measurements are relative development baselines, not production SLOs.",
      "The HTTP runner records tab wall time and payloads but not per-statement timings, so pool wait and statement share cannot be quantified from this baseline.",
      "Standalone EXPLAIN runs are sequential and cannot reproduce Promise.all connection-pool contention.",
      "The first HTTP request and priming EXPLAIN are informational; OS page cache and PostgreSQL service state are not reset.",
      "Large-tier measurements and frontend DevTools render timings are not part of this medium baseline artifact.",
    ],
  };
}

function renderCuratedMarkdown(baseline: CuratedAnalyticsBaseline): string {
  const slowestCells = [...baseline.http.cells]
    .filter((cell) => cell.latencyMs)
    .sort((left, right) => (right.latencyMs?.p95 ?? 0) - (left.latencyMs?.p95 ?? 0))
    .slice(0, 12);
  const slowestQueries = [...baseline.explain.targets]
    .sort((left, right) => right.executionMs.p95 - left.executionMs.p95)
    .slice(0, 15);
  const lines = [
    `# EventPulse Analytics Baseline: ${baseline.baselineId}`,
    "",
    "> Medium-tier baseline of record. Budgets are provisional development hypotheses, not production SLAs.",
    "",
    "## Identity",
    "",
    `- Git: \`${baseline.git.commitSha}\` (${baseline.git.branch}), dirty: ${baseline.git.dirty ? "yes" : "no"}`,
    `- Dataset manifest: \`${baseline.dataset.manifestHash}\``,
    `- Seed: ${baseline.dataset.seed}; spread: ${baseline.dataset.dateSpreadDays} days`,
    `- HTTP source: \`${baseline.http.sourceRunId}\``,
    `- EXPLAIN source: \`${baseline.explain.sourceRunId}\``,
    `- Counts unchanged: ${baseline.dataset.databaseUnchanged ? "yes" : "NO"}`,
    `- HTTP counts before/after: \`${JSON.stringify(baseline.dataset.httpCountsBefore)}\` / \`${JSON.stringify(baseline.dataset.httpCountsAfter)}\``,
    `- EXPLAIN counts before/after: \`${JSON.stringify(baseline.dataset.explainCountsBefore)}\` / \`${JSON.stringify(baseline.dataset.explainCountsAfter)}\``,
    "",
    "## Slowest HTTP Cells",
    "",
    "| Cell | Median ms | p95 ms | Median payload bytes |",
    "|---|---:|---:|---:|",
    ...slowestCells.map(
      (cell) =>
        `| ${cell.id} | ${formatNumber(cell.latencyMs?.median)} | ` +
        `${formatNumber(cell.latencyMs?.p95)} | ${formatNumber(cell.payloadBytes?.median)} |`,
    ),
    "",
    "## Slowest Standalone Queries",
    "",
    "| Target | Query | Median ms | p95 ms | Seq scans | Temp written | Dominant node |",
    "|---|---|---:|---:|---:|---:|---|",
    ...slowestQueries.map(
      (target) =>
        `| ${target.id} | #${target.queryId} ${target.label} | ` +
        `${formatNumber(target.executionMs.median)} | ${formatNumber(target.executionMs.p95)} | ` +
        `${target.representativePlan.sequentialScanCount} | ` +
        `${formatNumber(target.bufferStatistics.tempWritten.median)} | ` +
        `${markdownCell(target.representativePlan.dominantNode)} |`,
    ),
    "",
    "## Method",
    "",
    `- HTTP: ${baseline.http.configuration.warmups} warm-up + ${baseline.http.configuration.measuredRuns} measured requests per cell, sequential.`,
    `- EXPLAIN: ${baseline.explain.configuration.primingRuns} priming + ${baseline.explain.configuration.measuredRuns} measured plans per target.`,
    "- EXPLAIN form: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` in read-only rollback transactions.",
    "- Full raw plans remain under the gitignored benchmark results directory.",
    "- Detailed evidence and confidence labels: [findings.md](./findings.md).",
    "",
    "## Known Limitations",
    "",
    ...baseline.knownLimitations.map((limitation) => `- ${limitation}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function writeCuratedBaseline(
  baseline: CuratedAnalyticsBaseline,
  outputDirectory: string,
) {
  await mkdir(outputDirectory, { recursive: true });
  const jsonPath = path.join(outputDirectory, `${baseline.baselineId}.json`);
  const markdownPath = path.join(outputDirectory, `${baseline.baselineId}.md`);
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, renderCuratedMarkdown(baseline), "utf8"),
  ]);
  return { jsonPath, markdownPath };
}

function buildScope(input: {
  target: ExplainTarget;
  userId: string;
  projectId: string;
  anchor: Date;
}) {
  const customDates = resolveCustomDates(input.target.range, input.anchor);
  const result = createAnalyticsScope({
    userId: input.userId,
    projectId: input.target.projectScope === "single" ? input.projectId : null,
    range: customDates ? "custom" : input.target.range,
    from: customDates?.from ?? null,
    to: customDates?.to ?? null,
    now: input.anchor,
  });
  if (!result.valid) {
    throw new Error(`Could not build analytics scope for ${input.target.id}: ${result.message}`);
  }
  return { result, customDates };
}

async function main() {
  const options = parseExplainCli(process.argv.slice(2));
  if (options.help) {
    console.log(explainHelp());
    return;
  }
  const tier = options.tier;
  if (!tier) throw new Error("A benchmark tier is required.");
  const target = assertBenchmarkEnvironment({ operation: "explain analytics", tier });
  const { manifest, manifestPath } = await loadBenchmarkManifest(tier);
  const targets = buildExplainTargets(options);
  const anchor = new Date(manifest.anchor);
  const anchorDriftHours = (Date.now() - anchor.getTime()) / (60 * 60 * 1_000);
  if (anchorDriftHours < 0 || anchorDriftHours > MAX_ANCHOR_DRIFT_HOURS) {
    throw new Error(
      `Benchmark anchor drift is ${anchorDriftHours.toFixed(3)}h; reseed explicitly ` +
        `before EXPLAIN (maximum ${MAX_ANCHOR_DRIFT_HOURS}h).`,
    );
  }

  if (options.dryRun) {
    console.log(`[benchmark] manifest=${path.relative(REPOSITORY_ROOT, manifestPath)}`);
    console.log(`[benchmark] targets=${targets.length}`);
    for (const explainTarget of targets) console.log(`  ${explainTarget.id}`);
    return;
  }

  process.env.DATABASE_URL = target.databaseUrl;
  const pool = new Pool({ connectionString: target.databaseUrl });
  try {
    const countsBefore = await benchmarkCounts(pool);
    assertExpectedCounts(manifest.actual.tables, countsBefore);
    const identity = await benchmarkIdentity(pool, tier);
    const [git, environment] = await Promise.all([
      gitMetadata(),
      environmentMetadata(pool),
    ]);
    if (environment.postgres.databaseName !== target.databaseName) {
      throw new Error("Connected PostgreSQL database does not match the guarded target.");
    }

    const results: ExplainTargetResult[] = [];
    for (const [index, explainTarget] of targets.entries()) {
      const { result: scope, customDates } = buildScope({
        target: explainTarget,
        userId: identity.userId,
        projectId: identity.projectId,
        anchor,
      });
      console.log(
        `[benchmark] EXPLAIN ${index + 1}/${targets.length} ${explainTarget.id}`,
      );
      results.push(
        await runExplainTarget({
          pool,
          target: explainTarget,
          scope,
          customDates,
          primingRuns: options.primingRuns,
          measuredRuns: options.measuredRuns,
        }),
      );
    }

    const countsAfter = await benchmarkCounts(pool);
    const databaseUnchanged = countsEqual(countsBefore, countsAfter);
    if (!databaseUnchanged) {
      throw new Error("Benchmark tenant row counts changed during EXPLAIN collection.");
    }
    const timestamp = new Date().toISOString();
    const runId =
      options.runId ?? createRunId(timestamp, git.commitSha, manifest.tier);
    const warnings = [
      "Plans are standalone sequential measurements; they do not include Promise.all pool wait.",
      "The first priming plan is not a true OS-page-cache cold measurement.",
      ...(git.dirty ? ["The working tree was dirty when this run was captured."] : []),
      ...(!environment.runtime.nodeCommandVersion
        ? ["The node command was unavailable; Bun's Node compatibility version is recorded."]
        : []),
      ...(tier === "large" ? [] : ["Large-tier plans were not part of this run."]),
    ];
    const result: ExplainRunResult = {
      schemaVersion: "1.0.0",
      runId,
      timestamp,
      git,
      environment,
      dataset: {
        tier: manifest.tier,
        seed: manifest.seed,
        manifestHash: manifest.manifestHash,
        anchor: manifest.anchor,
        anchorDriftHours,
        dateSpreadDays: manifest.configured.dateSpreadDays,
        expectedTables: manifest.actual.tables,
        countsBefore,
        countsAfter,
        databaseUnchanged,
      },
      configuration: {
        queryIds: [...new Set(targets.map((entry) => entry.queryId))],
        projectScopes: options.projectScopes,
        ranges: options.ranges,
        primingRuns: options.primingRuns,
        measuredRuns: options.measuredRuns,
        targetCount: targets.length,
        sequentialTargets: true,
        transactionMode: "read-only-rollback",
      },
      queryInventory: ANALYTICS_QUERY_REGISTRY,
      targets: results,
      summary: {
        totalTargets: results.length,
        totalPrimingPlans: results.reduce(
          (sum, entry) => sum + entry.primingSamples.length,
          0,
        ),
        totalMeasuredPlans: results.reduce(
          (sum, entry) => sum + entry.measuredSamples.length,
          0,
        ),
        queriesCovered: [...new Set(results.map((entry) => entry.queryId))].sort(
          (left, right) => left - right,
        ),
      },
      warnings,
    };
    const output = await writeExplainResult(result, options.outputDirectory);
    console.log(`[benchmark] raw JSON=${output.jsonPath}`);
    console.log(`[benchmark] raw Markdown=${output.markdownPath}`);

    if (options.baselineId && options.httpResultPath) {
      const httpResult = await loadHttpResult(options.httpResultPath);
      const baseline = buildCuratedBaseline({
        baselineId: options.baselineId,
        http: httpResult,
        explain: result,
      });
      const curated = await writeCuratedBaseline(
        baseline,
        options.baselineDirectory,
      );
      console.log(`[benchmark] curated JSON=${curated.jsonPath}`);
      console.log(`[benchmark] curated Markdown=${curated.markdownPath}`);
    }
  } finally {
    await closeQueryRegistry();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[benchmark] EXPLAIN failed: ${message}`);
  process.exitCode = 1;
});
