import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  BENCHMARK_PROJECT_SCOPES,
  BENCHMARK_RANGES,
  BENCHMARK_TABS,
  BENCHMARK_TIERS,
  type BenchmarkCellDefinition,
  type BenchmarkCellResult,
  type BenchmarkCustomDates,
  type BenchmarkDatasetManifest,
  type BenchmarkProjectScope,
  type BenchmarkRange,
  type BenchmarkRunResult,
  type BenchmarkStatistics,
  type BenchmarkTab,
  type BenchmarkTier,
} from "./benchmark-types";

const DEFAULT_RANGES: BenchmarkRange[] = [
  "24h",
  "7d",
  "30d",
  "custom-long",
  "all",
];
const MAX_REPETITIONS = 100;

export const REPOSITORY_ROOT = path.resolve(__dirname, "../../../..");
export const DEFAULT_MANIFEST_PATH = path.join(
  REPOSITORY_ROOT,
  "benchmarks/dataset-manifest.json",
);
export const DEFAULT_OUTPUT_DIRECTORY = path.join(
  REPOSITORY_ROOT,
  "benchmarks/results/analytics",
);

export interface BenchmarkCliOptions {
  help: boolean;
  dryRun: boolean;
  tier: BenchmarkTier | null;
  tabs: BenchmarkTab[];
  projectScopes: BenchmarkProjectScope[];
  ranges: BenchmarkRange[];
  warmups: number;
  measuredRuns: number;
  baseUrl: string;
  outputDirectory: string;
  runId: string | null;
  hasExplicitMatrixFilters: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseList<T extends string>(input: {
  name: string;
  value: string;
  allowed: readonly T[];
}): T[] {
  const requested = input.value
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    throw new Error(`${input.name} requires at least one value.`);
  }

  const unknown = requested.filter(
    (value): value is string => !input.allowed.includes(value as T),
  );
  if (unknown.length > 0) {
    throw new Error(
      `${input.name} contains unsupported value(s): ${unknown.join(", ")}. ` +
        `Allowed: ${input.allowed.join(", ")}.`,
    );
  }

  const selected = new Set(requested);
  return input.allowed.filter((value) => selected.has(value));
}

function parseInteger(name: string, value: string, minimum: number): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer.`);
  }

  const parsed = Number(value);
  if (parsed < minimum || parsed > MAX_REPETITIONS) {
    throw new Error(
      `${name} must be between ${minimum} and ${MAX_REPETITIONS}.`,
    );
  }

  return parsed;
}

function normalizeBaseUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("--base-url must be a valid HTTP(S) URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("--base-url must use HTTP or HTTPS.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "--base-url must not contain credentials, query parameters, or a fragment.",
    );
  }
  if (url.pathname !== "/") {
    throw new Error("--base-url must be an origin without a path.");
  }

  const hostname = url.hostname.toLowerCase();
  const isLocal =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (!isLocal && !hostname.includes("bench")) {
    throw new Error(
      "Refusing to benchmark a non-local server whose hostname is not benchmark-marked.",
    );
  }

  return url.toString().replace(/\/$/, "");
}

function resolveOutputDirectory(value: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(REPOSITORY_ROOT, value);
}

function assertRunId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value)) {
    throw new Error(
      "--run-id must be 1-100 characters using only letters, numbers, dot, underscore, or hyphen.",
    );
  }

  return value;
}

function readOptionValue(args: string[], index: number, name: string) {
  const argument = args[index] ?? "";
  const equalsPrefix = `${name}=`;

  if (argument.startsWith(equalsPrefix)) {
    const value = argument.slice(equalsPrefix.length);
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

export function parseBenchmarkCli(args: string[]): BenchmarkCliOptions {
  let help = false;
  let dryRun = false;
  let tier: BenchmarkTier | null = null;
  let tabs: BenchmarkTab[] = [...BENCHMARK_TABS];
  let projectScopes: BenchmarkProjectScope[] = [
    ...BENCHMARK_PROJECT_SCOPES,
  ];
  let ranges: BenchmarkRange[] = [...DEFAULT_RANGES];
  let warmups: number | null = null;
  let measuredRuns: number | null = null;
  let baseUrl =
    process.env.BENCHMARK_BASE_URL ??
    process.env.BENCHMARK_SERVER_URL ??
    "http://localhost:5001";
  let outputDirectory = DEFAULT_OUTPUT_DIRECTORY;
  let runId: string | null = null;
  let hasExplicitMatrixFilters = false;

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
      if (!BENCHMARK_TIERS.includes(tierOption.value as BenchmarkTier)) {
        throw new Error("--tier must be small, medium, or large.");
      }
      tier = tierOption.value as BenchmarkTier;
      index += tierOption.consumed;
      continue;
    }

    const tabsOption = readOptionValue(args, index, "--tabs");
    if (tabsOption) {
      tabs = parseList({
        name: "--tabs",
        value: tabsOption.value,
        allowed: BENCHMARK_TABS,
      });
      hasExplicitMatrixFilters = true;
      index += tabsOption.consumed;
      continue;
    }

    const projectsOption = readOptionValue(args, index, "--projects");
    if (projectsOption) {
      projectScopes = parseList({
        name: "--projects",
        value: projectsOption.value,
        allowed: BENCHMARK_PROJECT_SCOPES,
      });
      hasExplicitMatrixFilters = true;
      index += projectsOption.consumed;
      continue;
    }

    const rangesOption = readOptionValue(args, index, "--ranges");
    if (rangesOption) {
      ranges = parseList({
        name: "--ranges",
        value: rangesOption.value,
        allowed: BENCHMARK_RANGES,
      });
      hasExplicitMatrixFilters = true;
      index += rangesOption.consumed;
      continue;
    }

    const warmupsOption = readOptionValue(args, index, "--warmups");
    if (warmupsOption) {
      warmups = parseInteger("--warmups", warmupsOption.value, 0);
      index += warmupsOption.consumed;
      continue;
    }

    const runsOption = readOptionValue(args, index, "--runs");
    if (runsOption) {
      measuredRuns = parseInteger("--runs", runsOption.value, 1);
      index += runsOption.consumed;
      continue;
    }

    const baseUrlOption = readOptionValue(args, index, "--base-url");
    if (baseUrlOption) {
      baseUrl = baseUrlOption.value;
      index += baseUrlOption.consumed;
      continue;
    }

    const outputOption = readOptionValue(args, index, "--output-dir");
    if (outputOption) {
      outputDirectory = resolveOutputDirectory(outputOption.value);
      index += outputOption.consumed;
      continue;
    }

    const runIdOption = readOptionValue(args, index, "--run-id");
    if (runIdOption) {
      runId = assertRunId(runIdOption.value);
      index += runIdOption.consumed;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!help && tier === null) {
    throw new Error("--tier=small|medium|large is required.");
  }

  const resolvedTier = tier ?? "small";
  return {
    help,
    dryRun,
    tier,
    tabs,
    projectScopes,
    ranges,
    warmups: warmups ?? 1,
    measuredRuns: measuredRuns ?? (resolvedTier === "small" ? 5 : 10),
    baseUrl: normalizeBaseUrl(baseUrl),
    outputDirectory,
    runId,
    hasExplicitMatrixFilters,
  };
}

export function benchmarkHelp(): string {
  return `EventPulse analytics benchmark runner

Usage:
  bun run bench:run -- --tier=<small|medium|large> [options]

Options:
  --tier VALUE          Dataset tier; must match the dataset manifest (required)
  --tabs LIST           ${BENCHMARK_TABS.join(",")}
  --projects LIST       ${BENCHMARK_PROJECT_SCOPES.join(",")}
  --ranges LIST         ${BENCHMARK_RANGES.join(",")}
  --warmups N           Sequential warm-up requests per cell (default: 1)
  --runs N              Sequential measured requests (small: 5; others: 10)
  --base-url URL        Running benchmark server (default: http://localhost:5001)
  --output-dir PATH     JSON/Markdown directory (default: benchmarks/results/analytics)
  --run-id ID           Safe output basename; generated when omitted
  --dry-run             Validate guard/manifest and print the matrix; no HTTP or output files
  --help, -h            Show this help

Environment:
  BENCHMARK_DATABASE_URL  Required benchmark-marked PostgreSQL URL
  BENCHMARK_USER_PASSWORD Required for non-dry authenticated runs
  BENCHMARK_MANIFEST_PATH Optional manifest override for harness validation

Defaults:
  Small/medium run 60 cells: 6 tabs x 2 scopes x
  {24h,7d,30d,custom-long,all}. custom-long is the deterministic 45-day
  calendar range from the plan; custom-short is supported when explicitly selected.
  Large uses the plan's targeted subset unless any matrix filter is supplied.`;
}

export function buildBenchmarkMatrix(
  options: BenchmarkCliOptions,
): BenchmarkCellDefinition[] {
  if (!options.tier) return [];

  const cells: BenchmarkCellDefinition[] = [];

  for (const tab of options.tabs) {
    for (const projectScope of options.projectScopes) {
      for (const range of options.ranges) {
        if (
          options.tier === "large" &&
          !options.hasExplicitMatrixFilters &&
          !(
            (projectScope === "all" &&
              (range === "7d" || range === "30d" || range === "all")) ||
            (projectScope === "single" &&
              (tab === "overview" || tab === "products") &&
              (range === "30d" || range === "all"))
          )
        ) {
          continue;
        }

        cells.push({
          id: `${tab}:${projectScope}:${range}`,
          tab,
          projectScope,
          range,
        });
      }
    }
  }

  if (cells.length === 0) {
    throw new Error("The selected benchmark matrix has no cells.");
  }

  return cells;
}

function subtractUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1_000);
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveCustomDates(
  range: BenchmarkRange,
  anchor: Date,
): BenchmarkCustomDates | null {
  if (range !== "custom-short" && range !== "custom-long") {
    return null;
  }

  const end = subtractUtcDays(anchor, 5);
  const dayCount = range === "custom-short" ? 7 : 45;
  const start = subtractUtcDays(end, dayCount - 1);

  return { from: dateOnly(start), to: dateOnly(end) };
}

export function buildAnalyticsRequestPath(input: {
  cell: BenchmarkCellDefinition;
  projectId: string;
  anchor: Date;
}): { path: string; customDates: BenchmarkCustomDates | null } {
  const params = new URLSearchParams({ tab: input.cell.tab });

  if (input.cell.projectScope === "single") {
    params.set("projectId", input.projectId);
  }

  const customDates = resolveCustomDates(input.cell.range, input.anchor);
  if (customDates) {
    params.set("range", "custom");
    params.set("from", customDates.from);
    params.set("to", customDates.to);
  } else {
    params.set("range", input.cell.range);
  }

  return {
    path: `/api/analytics/summary?${params.toString()}`,
    customDates,
  };
}

function validateTableCounts(value: unknown): value is BenchmarkDatasetManifest["actual"]["tables"] {
  if (!isRecord(value)) return false;
  return [
    "users",
    "projects",
    "apiKeys",
    "events",
    "alerts",
    "alertTriggers",
  ].every((key) => isNonNegativeNumber(value[key]));
}

function validateEventNames(value: unknown): value is Record<string, number> {
  return (
    isRecord(value) &&
    Object.values(value).every((count) => isNonNegativeNumber(count))
  );
}

function hasNonNegativeNumberFields(
  value: Record<string, unknown>,
  fields: string[],
): boolean {
  return fields.every((field) => isNonNegativeNumber(value[field]));
}

function manifestHash(manifest: BenchmarkDatasetManifest): string {
  const input = {
    tier: manifest.tier,
    seed: manifest.seed,
    expectedTables: manifest.expected.tables,
    actualTables: manifest.actual.tables,
    expectedEventNames: manifest.expected.eventNames,
    actualEventNames: manifest.actual.eventNames,
    ...(manifest.datasetRevision
      ? { datasetRevision: manifest.datasetRevision }
      : {}),
    ...(manifest.expected.phase2
      ? { expectedPhase2: manifest.expected.phase2 }
      : {}),
  };

  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function loadBenchmarkManifest(
  expectedTier: BenchmarkTier,
): Promise<{ manifest: BenchmarkDatasetManifest; manifestPath: string }> {
  const manifestPath = process.env.BENCHMARK_MANIFEST_PATH
    ? path.resolve(process.env.BENCHMARK_MANIFEST_PATH)
    : DEFAULT_MANIFEST_PATH;
  let source: string;

  try {
    source = await readFile(manifestPath, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Benchmark dataset manifest is missing or unreadable: ${detail}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("Benchmark dataset manifest is not valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Benchmark dataset manifest must be a JSON object.");
  }

  const configured = parsed.configured;
  const expected = parsed.expected;
  const actual = parsed.actual;
  if (
    parsed.version !== 1 ||
    (parsed.datasetRevision !== undefined &&
      typeof parsed.datasetRevision !== "string") ||
    !BENCHMARK_TIERS.includes(parsed.tier as BenchmarkTier) ||
    !isNonNegativeNumber(parsed.seed) ||
    typeof parsed.anchor !== "string" ||
    Number.isNaN(Date.parse(parsed.anchor)) ||
    typeof parsed.manifestHash !== "string" ||
    !isRecord(configured) ||
    !hasNonNegativeNumberFields(configured, [
      "projects",
      "productsPerProject",
      "categoriesPerProject",
      "customers",
      "sessions",
      "approximateEvents",
      "dateSpreadDays",
    ]) ||
    typeof configured.appendSecondaryTenant !== "boolean" ||
    !isRecord(expected) ||
    !isRecord(actual) ||
    !validateTableCounts(expected.tables) ||
    !validateEventNames(expected.eventNames) ||
    !isRecord(expected.logical) ||
    !hasNonNegativeNumberFields(expected.logical, [
      "primaryCustomers",
      "primarySessions",
      "secondaryCustomers",
      "secondarySessions",
    ]) ||
    (expected.phase2 !== undefined && !validateEventNames(expected.phase2)) ||
    !validateTableCounts(actual.tables) ||
    !validateEventNames(actual.eventNames)
  ) {
    throw new Error("Benchmark dataset manifest has an unsupported shape.");
  }

  const manifest = parsed as unknown as BenchmarkDatasetManifest;
  if (manifest.tier !== expectedTier) {
    throw new Error(
      `Benchmark manifest tier is ${manifest.tier}; requested tier is ${expectedTier}.`,
    );
  }
  if (manifest.manifestHash !== manifestHash(manifest)) {
    throw new Error("Benchmark dataset manifest hash does not match its contents.");
  }

  for (const key of Object.keys(
    manifest.expected.tables,
  ) as (keyof BenchmarkDatasetManifest["expected"]["tables"])[]) {
    if (manifest.expected.tables[key] !== manifest.actual.tables[key]) {
      throw new Error(
        `Benchmark manifest count mismatch for ${key}: expected ` +
          `${manifest.expected.tables[key]}, found ${manifest.actual.tables[key]}.`,
      );
    }
  }

  return { manifest, manifestPath };
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export function calculateStatistics(values: number[]): BenchmarkStatistics | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0);
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

  return {
    count: sorted.length,
    min: round(sorted[0] ?? 0),
    median: round(median),
    p95: round(sorted[p95Index] ?? 0),
    max: round(sorted[sorted.length - 1] ?? 0),
  };
}

function arrayField(value: Record<string, unknown>, key: string): boolean {
  return Array.isArray(value[key]);
}

function validateOrdersMeasurement(value: unknown, path: string): string[] {
  if (!isRecord(value)) return [`${path} must be an object.`];

  const issues: string[] = [];
  if (
    value.status !== "confirmed" &&
    value.status !== "estimated" &&
    value.status !== "unavailable"
  ) {
    return [`${path}.status must be confirmed, estimated, or unavailable.`];
  }

  if (typeof value.label !== "string" || typeof value.isEstimated !== "boolean") {
    issues.push(`${path} must include label and isEstimated.`);
  }

  if (value.status === "confirmed") {
    if (!isNonNegativeNumber(value.value)) {
      issues.push(`${path}.value must be non-negative when confirmed.`);
    }
    if (value.basis !== "distinct-order-id" || value.isEstimated !== false) {
      issues.push(`${path} confirmed basis must be distinct-order-id.`);
    }
    if (value.unlockGuidance !== null) {
      issues.push(`${path}.unlockGuidance must be null when confirmed.`);
    }
  } else if (value.status === "estimated") {
    if (!isNonNegativeNumber(value.value)) {
      issues.push(`${path}.value must be non-negative when estimated.`);
    }
    if (value.basis !== "purchasing-session-estimate" || value.isEstimated !== true) {
      issues.push(`${path} estimated basis must be purchasing-session-estimate.`);
    }
    if (typeof value.unlockGuidance !== "string") {
      issues.push(`${path}.unlockGuidance must explain an estimated value.`);
    }
  } else {
    if (value.value !== null || value.basis !== null || value.isEstimated !== false) {
      issues.push(`${path} unavailable state must use null value and basis.`);
    }
    if (typeof value.unlockGuidance !== "string") {
      issues.push(`${path}.unlockGuidance must explain an unavailable value.`);
    }
  }

  return issues;
}

function validateMoneyMeasurement(value: unknown, path: string): string[] {
  if (!isRecord(value)) return [`${path} must be an object.`];
  if (value.status !== "available" && value.status !== "unavailable") {
    return [`${path}.status must be available or unavailable.`];
  }

  const issues: string[] = [];
  if (value.status === "available") {
    if (
      typeof value.dominantCurrency !== "string" ||
      !isNonNegativeNumber(value.headlineGmv) ||
      !isNonNegativeNumber(value.headlineAov) ||
      !Array.isArray(value.currencies)
    ) {
      issues.push(`${path} available state must include currency, GMV, AOV, and currencies.`);
    }
    if (value.unlockGuidance !== null) {
      issues.push(`${path}.unlockGuidance must be null when available.`);
    }
  } else {
    if (
      value.dominantCurrency !== null ||
      value.headlineGmv !== null ||
      value.headlineAov !== null ||
      !Array.isArray(value.currencies)
    ) {
      issues.push(`${path} unavailable state must use null money fields and currencies[].`);
    }
    if (typeof value.unlockGuidance !== "string") {
      issues.push(`${path}.unlockGuidance must explain unavailable money.`);
    }
  }
  return issues;
}

function validateOverviewMoneyKpi(value: unknown, path: string): string[] {
  if (!isRecord(value)) return [`${path} must be an object.`];
  if (value.status !== "available" && value.status !== "unavailable") {
    return [`${path}.status must be available or unavailable.`];
  }
  if (value.status === "available") {
    return typeof value.currency === "string" && isNonNegativeNumber(value.value)
      ? []
      : [`${path} available state must include currency and a non-negative value.`];
  }
  return value.currency === null && value.value === null &&
    typeof value.unlockGuidance === "string"
    ? []
    : [`${path} unavailable state must use null value/currency and unlock guidance.`];
}

function isPercentageOrNull(value: unknown): value is number | null {
  return (
    value === null ||
    (isNonNegativeNumber(value) && value <= 100)
  );
}

function validateShopperPayload(
  data: Record<string, unknown>,
  range?: BenchmarkRange,
): string[] {
  const issues: string[] = [];
  const summary = data.shopperSummary;
  if (
    !isRecord(summary) ||
    !isNonNegativeNumber(summary.uniqueCustomers) ||
    !isNonNegativeNumber(summary.uniqueSessions) ||
    !isNonNegativeNumber(summary.purchasingSessions)
  ) {
    issues.push("shopperSummary counts must be non-negative numbers.");
  }

  const trend = data.shopperTrend;
  const trendPoints = new Map<string, number>();
  let trendGranularity: string | null = null;
  if (
    !isRecord(trend) ||
    !["hour", "day", "month"].includes(String(trend.granularity)) ||
    !Array.isArray(trend.points)
  ) {
    issues.push("shopperTrend must include a valid granularity and points[].");
  } else {
    trendGranularity = String(trend.granularity);
    for (const [index, point] of trend.points.entries()) {
      if (
        !isRecord(point) ||
        typeof point.date !== "string" ||
        !isNonNegativeNumber(point.shoppers)
      ) {
        issues.push(`shopperTrend.points[${index}] is invalid.`);
        continue;
      }
      if (trendPoints.has(point.date)) {
        issues.push(`shopperTrend has a duplicate bucket: ${point.date}.`);
      }
      trendPoints.set(point.date, point.shoppers);
    }
  }

  const coverage = data.shopperCoverage;
  if (
    !isRecord(coverage) ||
    !isNonNegativeNumber(coverage.eventsInScope) ||
    !isNonNegativeNumber(coverage.eventsWithCustomerId) ||
    !isPercentageOrNull(coverage.excludedPercent)
  ) {
    issues.push("shopperCoverage fields are invalid.");
  } else {
    if (coverage.eventsWithCustomerId > coverage.eventsInScope) {
      issues.push("shopperCoverage cannot exceed eventsInScope.");
    }
    if (coverage.eventsInScope === 0 && coverage.excludedPercent !== null) {
      issues.push("shopperCoverage.excludedPercent must be null for an empty scope.");
    }
  }

  const lifecycle = data.shopperLifecycle;
  if (
    !isRecord(lifecycle) ||
    !isRecord(lifecycle.summary) ||
    !isRecord(lifecycle.series) ||
    !["hour", "day", "month"].includes(String(lifecycle.series.granularity)) ||
    !Array.isArray(lifecycle.series.points)
  ) {
    issues.push("shopperLifecycle must include summary and a valid series.");
  } else {
    const lifecycleSummary = lifecycle.summary;
    if (range === "all" && lifecycleSummary.status !== "not-applicable") {
      issues.push("shopperLifecycle.summary must be not-applicable for all-time.");
    } else if (range && range !== "all" && lifecycleSummary.status !== "available") {
      issues.push("shopperLifecycle.summary must be available for bounded ranges.");
    }

    if (lifecycleSummary.status === "available") {
      if (
        !hasNonNegativeNumberFields(lifecycleSummary, [
          "activeShoppers",
          "newShoppers",
          "returningShoppers",
        ]) ||
        !isPercentageOrNull(lifecycleSummary.newPercent) ||
        !isPercentageOrNull(lifecycleSummary.returningPercent)
      ) {
        issues.push("shopperLifecycle available summary fields are invalid.");
      } else if (
        Number(lifecycleSummary.newShoppers) +
          Number(lifecycleSummary.returningShoppers) !==
        Number(lifecycleSummary.activeShoppers)
      ) {
        issues.push("shopperLifecycle summary new + returning must equal active.");
      }
    } else if (
      lifecycleSummary.status !== "not-applicable" ||
      lifecycleSummary.reason !== "unbounded-range" ||
      typeof lifecycleSummary.message !== "string"
    ) {
      issues.push("shopperLifecycle summary has an invalid discriminant.");
    }

    if (
      trendGranularity !== null &&
      lifecycle.series.granularity !== trendGranularity
    ) {
      issues.push("shopperLifecycle and shopperTrend granularities must match.");
    }

    const lifecycleDates = new Set<string>();
    for (const [index, point] of lifecycle.series.points.entries()) {
      if (
        !isRecord(point) ||
        typeof point.date !== "string" ||
        !hasNonNegativeNumberFields(point, [
          "activeShoppers",
          "newShoppers",
          "returningShoppers",
        ])
      ) {
        issues.push(`shopperLifecycle.series.points[${index}] is invalid.`);
        continue;
      }
      lifecycleDates.add(point.date);
      if (
        Number(point.newShoppers) + Number(point.returningShoppers) !==
        Number(point.activeShoppers)
      ) {
        issues.push(
          `shopperLifecycle bucket ${point.date} new + returning must equal active.`,
        );
      }
      const trendShoppers = trendPoints.get(point.date);
      if (trendShoppers === undefined || trendShoppers !== point.activeShoppers) {
        issues.push(
          `shopperLifecycle bucket ${point.date} must match shopperTrend.`,
        );
      }
    }
    if (lifecycleDates.size !== trendPoints.size) {
      issues.push("shopperLifecycle and shopperTrend must contain the same buckets.");
    }
  }

  const repeatPurchase = data.repeatPurchase;
  if (!isRecord(repeatPurchase)) {
    issues.push("repeatPurchase must be an object.");
  } else if (repeatPurchase.status === "available") {
    if (
      !isNonNegativeNumber(repeatPurchase.buyers) ||
      !isNonNegativeNumber(repeatPurchase.repeatBuyers) ||
      !isPercentageOrNull(repeatPurchase.repeatRatePercent) ||
      !(
        repeatPurchase.averageOrdersPerBuyer === null ||
        isNonNegativeNumber(repeatPurchase.averageOrdersPerBuyer)
      )
    ) {
      issues.push("repeatPurchase available fields are invalid.");
    } else {
      if (repeatPurchase.repeatBuyers > repeatPurchase.buyers) {
        issues.push("repeatPurchase.repeatBuyers cannot exceed buyers.");
      }
      if (
        repeatPurchase.buyers === 0 &&
        (repeatPurchase.repeatRatePercent !== null ||
          repeatPurchase.averageOrdersPerBuyer !== null)
      ) {
        issues.push("repeatPurchase empty state must use null rates.");
      }
    }
  } else if (
    repeatPurchase.status !== "unavailable" ||
    !Array.isArray(repeatPurchase.missingFields) ||
    !repeatPurchase.missingFields.every(
      (field): field is string => typeof field === "string",
    ) ||
    typeof repeatPurchase.message !== "string"
  ) {
    issues.push("repeatPurchase has an invalid availability discriminant.");
  }

  const topShoppers = data.topShoppers;
  if (!isRecord(topShoppers)) {
    issues.push("topShoppers must be an object.");
  } else if (topShoppers.status === "available") {
    if (
      !(topShoppers.currency === null || typeof topShoppers.currency === "string") ||
      !Array.isArray(topShoppers.rows) ||
      !isNonNegativeNumber(topShoppers.ordersExcludedForCurrency) ||
      !isNonNegativeNumber(topShoppers.unattributedOrders)
    ) {
      issues.push("topShoppers available fields are invalid.");
    } else {
      if (topShoppers.rows.length > 10) {
        issues.push("topShoppers.rows must contain at most 10 shoppers.");
      }
      let previous: Record<string, unknown> | null = null;
      for (const [index, row] of topShoppers.rows.entries()) {
        if (
          !isRecord(row) ||
          typeof row.projectId !== "string" ||
          typeof row.projectName !== "string" ||
          typeof row.customerId !== "string" ||
          !isNonNegativeNumber(row.confirmedOrders) ||
          !isNonNegativeNumber(row.sessions) ||
          !(row.gmv === null || isNonNegativeNumber(row.gmv))
        ) {
          issues.push(`topShoppers.rows[${index}] is invalid.`);
          continue;
        }
        if (topShoppers.currency === null && row.gmv !== null) {
          issues.push("topShoppers rows cannot contain GMV without a currency.");
        }
        if (previous) {
          const outOfOrder =
            Number(previous.confirmedOrders) < row.confirmedOrders ||
            (previous.confirmedOrders === row.confirmedOrders &&
              Number(previous.sessions) < row.sessions) ||
            (previous.confirmedOrders === row.confirmedOrders &&
              previous.sessions === row.sessions &&
              String(previous.customerId) > row.customerId) ||
            (previous.confirmedOrders === row.confirmedOrders &&
              previous.sessions === row.sessions &&
              previous.customerId === row.customerId &&
              String(previous.projectId) > row.projectId);
          if (outOfOrder) {
            issues.push("topShoppers.rows must preserve deterministic ranking.");
          }
        }
        previous = row;
      }
    }
  } else if (
    topShoppers.status !== "unavailable" ||
    !Array.isArray(topShoppers.missingFields) ||
    !topShoppers.missingFields.every(
      (field): field is string => typeof field === "string",
    ) ||
    typeof topShoppers.message !== "string"
  ) {
    issues.push("topShoppers has an invalid availability discriminant.");
  }

  if (
    isRecord(repeatPurchase) &&
    isRecord(topShoppers) &&
    repeatPurchase.status !== topShoppers.status
  ) {
    issues.push("repeatPurchase and topShoppers availability must match.");
  }

  return issues;
}

export function validateAnalyticsPayload(
  tab: BenchmarkTab,
  payload: unknown,
  range?: BenchmarkRange,
): string[] {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
    return ["Response must be a successful analytics envelope with object data."];
  }

  const data = payload.data;
  switch (tab) {
    case "overview": {
      const issues: string[] = [];
      if (!isRecord(data.summary) || !isNonNegativeNumber(data.summary.totalEvents)) {
        issues.push("summary.totalEvents must be a non-negative number.");
      }
      if (!isRecord(data.trend) || !arrayField(data.trend, "points")) {
        issues.push("trend.points must be an array.");
      }
      if (!Array.isArray(data.insights)) issues.push("insights must be an array.");
      if (!isRecord(data.comparison)) issues.push("comparison must be an object.");
      if (!isRecord(data.health)) issues.push("health must be an object.");
      issues.push(...validateOrdersMeasurement(data.orders, "orders"));
      issues.push(...validateOverviewMoneyKpi(data.gmv, "gmv"));
      issues.push(...validateOverviewMoneyKpi(data.aov, "aov"));
      return issues;
    }
    case "conversion": {
      const issues: string[] = [];
      if (!isRecord(data.commerceFunnel) || !arrayField(data.commerceFunnel, "steps")) {
        issues.push("commerceFunnel.steps must be an array.");
      }
      if (!isRecord(data.sessionFunnel) || !arrayField(data.sessionFunnel, "steps")) {
        issues.push("sessionFunnel.steps must be an array.");
      }
      return issues;
    }
    case "products": {
      if (
        !isRecord(data.productPerformance) ||
        !arrayField(data.productPerformance, "products") ||
        !arrayField(data.productPerformance, "categories")
      ) {
        return [
          "productPerformance.products and productPerformance.categories must be arrays.",
        ];
      }
      return [];
    }
    case "sales": {
      const issues = [
        ...validateOrdersMeasurement(data.orders, "orders"),
        ...validateMoneyMeasurement(data.money, "money"),
      ];
      if (
        data.trend !== null &&
        (!isRecord(data.trend) || !arrayField(data.trend, "points"))
      ) {
        issues.push("trend must be null or an object with points[].");
      }
      if (!isRecord(data.comparison)) issues.push("comparison must be an object.");
      if (!Array.isArray(data.insights)) issues.push("insights must be an array.");
      if (!isRecord(data.dataQuality)) {
        issues.push("dataQuality must be an object.");
      } else {
        const countFields = [
          "purchaseEvents",
          "purchaseEventsWithOrderId",
          "paymentOnlyOrderIds",
          "missingOrderIdPurchaseEvents",
          "ordersWithoutMoney",
          "missingAmountOrders",
          "invalidAmountOrders",
          "negativeAmountOrders",
          "missingCurrencyOrders",
          "invalidCurrencyOrders",
          "conflictingMoneyEvidence",
        ];
        if (!hasNonNegativeNumberFields(data.dataQuality, countFields)) {
          issues.push("dataQuality count fields must be non-negative numbers.");
        }
        if (
          data.dataQuality.purchaseEventsWithOrderIdPercent !== null &&
          !isNonNegativeNumber(data.dataQuality.purchaseEventsWithOrderIdPercent)
        ) {
          issues.push("dataQuality.purchaseEventsWithOrderIdPercent must be null or non-negative.");
        }
      }
      return issues;
    }
    case "shoppers": {
      return validateShopperPayload(data, range);
    }
    case "behavior": {
      const required = [
        "topEvents",
        "eventsByProject",
        "recentActivity",
        "topProperties",
      ];
      const missing = required.filter((key) => !arrayField(data, key));
      return missing.length > 0
        ? [`Behavior activity arrays are missing: ${missing.join(", ")}.`]
        : [];
    }
  }
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/("?(?:password|token|secret|apiKey)"?\s*[:=]\s*)[^,}\s]+/gi, "$1[REDACTED]")
    .slice(0, 500);
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(3);
}

export function renderBenchmarkMarkdown(result: BenchmarkRunResult): string {
  const slowest = result.cells
    .filter((cell) => cell.latencyMs)
    .sort(
      (left, right) =>
        (right.latencyMs?.p95 ?? 0) - (left.latencyMs?.p95 ?? 0),
    )
    .slice(0, 10);
  const failed = result.cells.filter((cell) => cell.failed);
  const lines = [
    `# EventPulse Analytics Baseline: ${markdownCell(result.runId)}`,
    "",
    "> This report is a measurement baseline, not an optimization result.",
    "",
    "## Environment",
    "",
    `- Timestamp: ${result.timestamp}`,
    `- Git commit: \`${result.git.commitSha}\` (${markdownCell(result.git.branch)})`,
    `- Dirty working tree: ${result.git.dirty ? "yes" : "no"}`,
    `- Dataset: ${result.dataset.tier} / \`${result.dataset.manifestHash}\``,
    `- Anchor: ${result.dataset.anchor} (${result.dataset.anchorDriftHours.toFixed(3)}h drift)`,
    `- Bun: ${result.environment.runtime.bunVersion}`,
    `- Node command: ${result.environment.runtime.nodeCommandVersion ?? "unavailable"}`,
    `- PostgreSQL: ${markdownCell(result.environment.postgres.serverVersion)}`,
    `- OS: ${result.environment.operatingSystem.platform} ${result.environment.operatingSystem.release} (${result.environment.operatingSystem.architecture})`,
    "",
    "## Configuration",
    "",
    `- Tabs: ${result.configuration.tabs.join(", ")}`,
    `- Project scopes: ${result.configuration.projectScopes.join(", ")}`,
    `- Ranges: ${result.configuration.ranges.join(", ")}`,
    `- Warm-ups per cell: ${result.configuration.warmups}`,
    `- Measured runs per cell: ${result.configuration.measuredRuns}`,
    `- Requests: sequential (this is not a load test)`,
    "- First-run means the first runner request for a cell; it is not claimed to be an OS or database cold-cache measurement.",
    "",
    "## Results",
    "",
    "| Cell | First run ms | Median ms | p95 ms | Min ms | Max ms | Median bytes | Status |",
    "|---|---:|---:|---:|---:|---:|---:|---|",
    ...result.cells.map((cell) =>
      `| ${markdownCell(cell.id)} | ${formatNumber(cell.firstRunDurationMs)} | ` +
      `${formatNumber(cell.latencyMs?.median)} | ${formatNumber(cell.latencyMs?.p95)} | ` +
      `${formatNumber(cell.latencyMs?.min)} | ${formatNumber(cell.latencyMs?.max)} | ` +
      `${formatNumber(cell.payloadBytes?.median)} | ${cell.failed ? "FAILED" : "passed"} |`,
    ),
    "",
    "## Slowest p95 Cells",
    "",
    "| Cell | Median ms | p95 ms |",
    "|---|---:|---:|",
    ...(slowest.length > 0
      ? slowest.map(
          (cell) =>
            `| ${markdownCell(cell.id)} | ${formatNumber(cell.latencyMs?.median)} | ${formatNumber(cell.latencyMs?.p95)} |`,
        )
      : ["| — | — | — |"]),
    "",
    "## Failures",
    "",
    ...(failed.length > 0
      ? failed.map((cell) => {
          const errors = [...cell.warmupSamples, ...cell.measuredSamples]
            .filter((sample) => !sample.passed)
            .map((sample) => sample.error ?? `HTTP ${sample.status ?? "network"}`);
          return `- **${markdownCell(cell.id)}:** ${markdownCell([...new Set(errors)].join("; ") || "correctness canary failed")}`;
        })
      : ["- None."]),
    "",
    "## Contract Canaries",
    "",
    ...result.contractCanaries.map(
      (canary) =>
        `- ${canary.name}: expected ${canary.expectedStatus}, received ${canary.actualStatus ?? "network error"} — ${canary.passed ? "passed" : "FAILED"}`,
    ),
    "",
    "## Warnings",
    "",
    ...(result.warnings.length > 0
      ? result.warnings.map((warning) => `- ${markdownCell(warning)}`)
      : ["- None."]),
    "",
    `Database tenant row counts unchanged: ${result.dataset.databaseUnchanged ? "yes" : "NO"}.`,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export function summarizeResults(cells: BenchmarkCellResult[]) {
  const totalMeasuredRequests = cells.reduce(
    (sum, cell) => sum + cell.measuredSamples.length,
    0,
  );
  const successfulMeasuredRequests = cells.reduce(
    (sum, cell) => sum + cell.successCount,
    0,
  );

  return {
    totalCells: cells.length,
    passedCells: cells.filter((cell) => !cell.failed).length,
    failedCells: cells.filter((cell) => cell.failed).length,
    totalMeasuredRequests,
    successfulMeasuredRequests,
    failedMeasuredRequests: totalMeasuredRequests - successfulMeasuredRequests,
  };
}
