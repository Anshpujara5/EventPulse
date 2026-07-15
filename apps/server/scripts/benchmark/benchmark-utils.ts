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
  Small/medium run the plan's 50 cells: 5 tabs x 2 scopes x
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

export function validateAnalyticsPayload(
  tab: BenchmarkTab,
  payload: unknown,
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
    case "shoppers": {
      const summary = data.shopperSummary;
      if (
        !isRecord(summary) ||
        !isNonNegativeNumber(summary.uniqueCustomers) ||
        !isNonNegativeNumber(summary.uniqueSessions) ||
        !isNonNegativeNumber(summary.purchasingSessions)
      ) {
        return ["shopperSummary counts must be non-negative numbers."];
      }
      return [];
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
