import "dotenv/config";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Pool } from "pg";
import {
  type BenchmarkCellDefinition,
  type BenchmarkCellResult,
  type BenchmarkContractCanary,
  type BenchmarkEnvironmentMetadata,
  type BenchmarkRequestSample,
  type BenchmarkRunResult,
  type BenchmarkTableCounts,
  type BenchmarkTab,
} from "./benchmark-types";
import {
  benchmarkHelp,
  buildAnalyticsRequestPath,
  buildBenchmarkMatrix,
  calculateStatistics,
  loadBenchmarkManifest,
  parseBenchmarkCli,
  redactSensitiveText,
  renderBenchmarkMarkdown,
  summarizeResults,
  validateAnalyticsPayload,
} from "./benchmark-utils";
import {
  assertBenchmarkEnvironment,
  BENCHMARK_TENANT_EMAILS,
} from "./guard";

const execFileAsync = promisify(execFile);
const MAX_ANCHOR_DRIFT_HOURS = 6;
const BENCHMARK_USER_EMAIL = BENCHMARK_TENANT_EMAILS[0];

interface HttpCapture {
  durationMs: number;
  status: number | null;
  payloadBytes: number;
  payload: unknown;
  error: string | null;
}

interface SigninEnvelope {
  success: true;
  data: { token: string };
}

interface ProjectRecord {
  id: string;
  name: string;
}

interface ProjectEnvelope {
  success: true;
  data: { projects: ProjectRecord[] };
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

interface CountRow {
  users: number;
  projects: number;
  apiKeys: number;
  events: number;
  alerts: number;
  alertTriggers: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function parseJson(text: string): unknown {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function responseMessage(payload: unknown, body: string): string {
  if (isRecord(payload) && typeof payload.message === "string") {
    return redactSensitiveText(payload.message);
  }

  return redactSensitiveText(body || "Request failed without a response body.");
}

async function captureRequest(
  baseUrl: string,
  requestPath: string,
  init?: RequestInit,
): Promise<HttpCapture> {
  const startedAt = performance.now();

  try {
    const response = await fetch(`${baseUrl}${requestPath}`, init);
    const body = await response.text();
    const payloadBytes = new TextEncoder().encode(body).byteLength;
    const payload = parseJson(body);

    return {
      durationMs: roundMilliseconds(performance.now() - startedAt),
      status: response.status,
      payloadBytes,
      payload,
      error: response.ok ? null : responseMessage(payload, body),
    };
  } catch (error) {
    return {
      durationMs: roundMilliseconds(performance.now() - startedAt),
      status: null,
      payloadBytes: 0,
      payload: null,
      error: redactSensitiveText(
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
}

function toSample(input: {
  capture: HttpCapture;
  tab: BenchmarkTab;
  phase: BenchmarkRequestSample["phase"];
  iteration: number;
}): { sample: BenchmarkRequestSample; correctnessIssues: string[] } {
  const correctnessIssues =
    input.capture.status === 200
      ? validateAnalyticsPayload(input.tab, input.capture.payload)
      : [];
  const passed =
    input.capture.status === 200 &&
    input.capture.error === null &&
    correctnessIssues.length === 0;
  const error = input.capture.error ??
    (correctnessIssues.length > 0
      ? `Correctness canary failed: ${correctnessIssues.join(" ")}`
      : input.capture.status === 200
        ? null
        : `Expected HTTP 200, received ${input.capture.status ?? "network error"}.`);

  return {
    sample: {
      phase: input.phase,
      iteration: input.iteration,
      durationMs: input.capture.durationMs,
      status: input.capture.status,
      payloadBytes: input.capture.payloadBytes,
      passed,
      ...(error ? { error: redactSensitiveText(error) } : {}),
    },
    correctnessIssues,
  };
}

async function runCell(input: {
  baseUrl: string;
  token: string;
  definition: BenchmarkCellDefinition;
  projectId: string;
  anchor: Date;
  warmups: number;
  measuredRuns: number;
}): Promise<BenchmarkCellResult> {
  const { path: requestPath, customDates } = buildAnalyticsRequestPath({
    cell: input.definition,
    projectId: input.projectId,
    anchor: input.anchor,
  });
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${input.token}`,
  };
  const warmupSamples: BenchmarkRequestSample[] = [];
  const measuredSamples: BenchmarkRequestSample[] = [];
  const correctnessIssues: string[] = [];

  for (let iteration = 1; iteration <= input.warmups; iteration += 1) {
    const capture = await captureRequest(input.baseUrl, requestPath, { headers });
    const result = toSample({
      capture,
      tab: input.definition.tab,
      phase: "warmup",
      iteration,
    });
    warmupSamples.push(result.sample);
    correctnessIssues.push(...result.correctnessIssues);
  }

  for (let iteration = 1; iteration <= input.measuredRuns; iteration += 1) {
    const capture = await captureRequest(input.baseUrl, requestPath, { headers });
    const result = toSample({
      capture,
      tab: input.definition.tab,
      phase: "measured",
      iteration,
    });
    measuredSamples.push(result.sample);
    correctnessIssues.push(...result.correctnessIssues);
  }

  const successfulMeasured = measuredSamples.filter((sample) => sample.passed);
  const allSamples = [...warmupSamples, ...measuredSamples];
  const statusCounts: Record<string, number> = {};
  for (const sample of measuredSamples) {
    const status = sample.status === null ? "network-error" : String(sample.status);
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  const uniqueCorrectnessIssues = [...new Set(correctnessIssues)];
  const firstSample = warmupSamples[0] ?? measuredSamples[0];
  const failed =
    allSamples.some((sample) => !sample.passed) ||
    uniqueCorrectnessIssues.length > 0 ||
    measuredSamples.length !== input.measuredRuns;

  return {
    ...input.definition,
    requestPath,
    customDates,
    warmupSamples,
    measuredSamples,
    firstRunDurationMs: firstSample?.durationMs ?? null,
    latencyMs: calculateStatistics(
      successfulMeasured.map((sample) => sample.durationMs),
    ),
    payloadBytes: calculateStatistics(
      successfulMeasured.map((sample) => sample.payloadBytes),
    ),
    statusCounts,
    successCount: successfulMeasured.length,
    failureCount: measuredSamples.length - successfulMeasured.length,
    correctness: {
      passed: uniqueCorrectnessIssues.length === 0,
      issues: uniqueCorrectnessIssues,
    },
    failed,
  };
}

async function runContractCanaries(
  baseUrl: string,
  token: string,
): Promise<BenchmarkContractCanary[]> {
  const unknownTab = await captureRequest(
    baseUrl,
    "/api/analytics/summary?tab=bogus",
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const unauthenticated = await captureRequest(
    baseUrl,
    "/api/analytics/summary?tab=overview",
    { headers: { Accept: "application/json" } },
  );

  return [
    {
      name: "unknown-tab",
      expectedStatus: 400,
      actualStatus: unknownTab.status,
      durationMs: unknownTab.durationMs,
      passed: unknownTab.status === 400,
      ...(unknownTab.status === 400
        ? {}
        : { error: unknownTab.error ?? "Expected the unknown tab to return 400." }),
    },
    {
      name: "unauthenticated",
      expectedStatus: 401,
      actualStatus: unauthenticated.status,
      durationMs: unauthenticated.durationMs,
      passed: unauthenticated.status === 401,
      ...(unauthenticated.status === 401
        ? {}
        : {
            error:
              unauthenticated.error ??
              "Expected the unauthenticated request to return 401.",
          }),
    },
  ];
}

async function authenticateBenchmarkUser(
  baseUrl: string,
  password: string,
): Promise<string> {
  const capture = await captureRequest(baseUrl, "/api/auth/signin", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: BENCHMARK_USER_EMAIL, password }),
  });

  if (
    capture.status !== 200 ||
    !isRecord(capture.payload) ||
    capture.payload.success !== true ||
    !isRecord(capture.payload.data) ||
    typeof capture.payload.data.token !== "string"
  ) {
    throw new Error(
      `Benchmark authentication failed (${capture.status ?? "network error"}): ` +
        `${capture.error ?? "unexpected response shape"}`,
    );
  }

  return (capture.payload as unknown as SigninEnvelope).data.token;
}

async function verifyServerAndResolveProject(input: {
  baseUrl: string;
  token: string;
  tier: string;
  expectedPrimaryProjects: number;
}): Promise<string> {
  const health = await captureRequest(input.baseUrl, "/health");
  if (health.status !== 200) {
    throw new Error(
      `Benchmark server health check failed (${health.status ?? "network error"}): ` +
        `${health.error ?? "unexpected response"}`,
    );
  }

  const capture = await captureRequest(input.baseUrl, "/api/projects", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.token}`,
    },
  });
  if (
    capture.status !== 200 ||
    !isRecord(capture.payload) ||
    capture.payload.success !== true ||
    !isRecord(capture.payload.data) ||
    !Array.isArray(capture.payload.data.projects)
  ) {
    throw new Error(
      `Could not verify benchmark projects (${capture.status ?? "network error"}): ` +
        `${capture.error ?? "unexpected response shape"}`,
    );
  }

  const projects = (capture.payload as unknown as ProjectEnvelope).data.projects;
  if (projects.length !== input.expectedPrimaryProjects) {
    throw new Error(
      `Benchmark server returned ${projects.length} projects; expected ` +
        `${input.expectedPrimaryProjects} for the primary benchmark tenant.`,
    );
  }

  const expectedCanaryId = `bench-project-primary-${input.tier}-1`;
  const canary = projects.find(
    (project) =>
      project.id === expectedCanaryId && project.name === "bench-canary",
  );
  if (!canary) {
    throw new Error(
      "Refusing to continue: the running server does not expose the expected bench-canary project.",
    );
  }

  return canary.id;
}

async function getBenchmarkCounts(pool: Pool): Promise<BenchmarkTableCounts> {
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

function countsEqual(
  left: BenchmarkTableCounts,
  right: BenchmarkTableCounts,
): boolean {
  return (Object.keys(left) as (keyof BenchmarkTableCounts)[]).every(
    (key) => left[key] === right[key],
  );
}

function assertExpectedCounts(
  expected: BenchmarkTableCounts,
  actual: BenchmarkTableCounts,
) {
  for (const key of Object.keys(expected) as (keyof BenchmarkTableCounts)[]) {
    if (expected[key] !== actual[key]) {
      throw new Error(
        `Benchmark database count mismatch for ${key}: expected ` +
          `${expected[key]}, found ${actual[key]}. Reseed explicitly before running.`,
      );
    }
  }
}

async function collectPostgresMetadata(
  pool: Pool,
): Promise<BenchmarkEnvironmentMetadata["postgres"]> {
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
  if (!row) throw new Error("Could not collect PostgreSQL benchmark metadata.");
  return row;
}

async function optionalCommand(command: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd: path.resolve(__dirname, "../../../.."),
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function collectGitMetadata() {
  const [commitSha, branch, status] = await Promise.all([
    optionalCommand("git", ["rev-parse", "HEAD"]),
    optionalCommand("git", ["branch", "--show-current"]),
    optionalCommand("git", ["status", "--porcelain"]),
  ]);

  if (!commitSha || !branch) {
    throw new Error("Could not collect Git commit and branch metadata.");
  }

  return { commitSha, branch, dirty: Boolean(status) };
}

async function collectEnvironmentMetadata(
  pool: Pool,
): Promise<BenchmarkEnvironmentMetadata> {
  const [nodeCommandVersion, postgres] = await Promise.all([
    optionalCommand("node", ["--version"]),
    collectPostgresMetadata(pool),
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
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  return `${safeTimestamp}-${commitSha.slice(0, 8)}-${tier}`;
}

async function writeResults(
  outputDirectory: string,
  result: BenchmarkRunResult,
): Promise<{ jsonPath: string; markdownPath: string }> {
  await mkdir(outputDirectory, { recursive: true });
  const jsonPath = path.join(outputDirectory, `${result.runId}.json`);
  const markdownPath = path.join(outputDirectory, `${result.runId}.md`);

  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, renderBenchmarkMarkdown(result), "utf8"),
  ]);

  return { jsonPath, markdownPath };
}

async function main() {
  const options = parseBenchmarkCli(process.argv.slice(2));
  if (options.help) {
    console.log(benchmarkHelp());
    return;
  }
  if (!options.tier) throw new Error("Benchmark tier is required.");

  const target = assertBenchmarkEnvironment({
    operation: options.dryRun ? "analytics-dry-run" : "analytics-run",
    tier: options.tier,
  });
  const { manifest } = await loadBenchmarkManifest(options.tier);
  const anchor = new Date(manifest.anchor);
  const anchorDriftHours = Math.abs(Date.now() - anchor.getTime()) / 3_600_000;
  if (anchorDriftHours > MAX_ANCHOR_DRIFT_HOURS) {
    throw new Error(
      `Benchmark anchor drift is ${anchorDriftHours.toFixed(3)} hours; ` +
        `maximum allowed is ${MAX_ANCHOR_DRIFT_HOURS}. Reseed explicitly.`,
    );
  }

  const cells = buildBenchmarkMatrix(options);
  if (options.dryRun) {
    console.log(
      `[benchmark] dry run: tier=${options.tier}, cells=${cells.length}, ` +
        `warmups=${options.warmups}, runs=${options.measuredRuns}`,
    );
    for (const cell of cells) {
      const request = buildAnalyticsRequestPath({
        cell,
        projectId: `bench-project-primary-${options.tier}-1`,
        anchor,
      });
      console.log(`[benchmark] ${cell.id} -> ${request.path}`);
    }
    console.log("[benchmark] dry run complete; no HTTP requests or output files were created.");
    return;
  }

  const password = process.env.BENCHMARK_USER_PASSWORD;
  if (!password) {
    throw new Error("BENCHMARK_USER_PASSWORD is required for authenticated runs.");
  }

  const pool = new Pool({ connectionString: target.databaseUrl, max: 1 });
  try {
    const timestamp = new Date().toISOString();
    const [git, environment, countsBefore] = await Promise.all([
      collectGitMetadata(),
      collectEnvironmentMetadata(pool),
      getBenchmarkCounts(pool),
    ]);
    assertExpectedCounts(manifest.expected.tables, countsBefore);

    const warnings: string[] = [];
    if (git.dirty) {
      warnings.push(
        "The working tree was dirty; this baseline is less reproducible than a clean-commit run.",
      );
    }
    if (!environment.runtime.nodeCommandVersion) {
      warnings.push(
        "The Node command was unavailable; the runner executed with Bun and recorded Bun's Node compatibility version.",
      );
    }
    if (options.tier === "large" && !options.hasExplicitMatrixFilters) {
      warnings.push(
        "The large-tier default uses the targeted matrix described by the plan rather than the full cross product.",
      );
    }

    const token = await authenticateBenchmarkUser(options.baseUrl, password);
    const projectId = await verifyServerAndResolveProject({
      baseUrl: options.baseUrl,
      token,
      tier: options.tier,
      expectedPrimaryProjects: manifest.configured.projects,
    });
    const contractCanaries = await runContractCanaries(options.baseUrl, token);
    const cellResults: BenchmarkCellResult[] = [];

    for (const [index, definition] of cells.entries()) {
      console.log(
        `[benchmark] cell ${index + 1}/${cells.length}: ${definition.id}`,
      );
      const result = await runCell({
        baseUrl: options.baseUrl,
        token,
        definition,
        projectId,
        anchor,
        warmups: options.warmups,
        measuredRuns: options.measuredRuns,
      });
      cellResults.push(result);
    }

    const countsAfter = await getBenchmarkCounts(pool);
    const databaseUnchanged = countsEqual(countsBefore, countsAfter);
    if (!databaseUnchanged) {
      warnings.push(
        "Benchmark tenant row counts changed during the run; the read-only invariant failed.",
      );
    }

    const failedCanaries = contractCanaries.filter((canary) => !canary.passed);
    if (failedCanaries.length > 0) {
      warnings.push(
        `Contract canaries failed: ${failedCanaries.map((canary) => canary.name).join(", ")}.`,
      );
    }

    const runId = options.runId ?? createRunId(timestamp, git.commitSha, options.tier);
    const result: BenchmarkRunResult = {
      schemaVersion: "1.0.0",
      runId,
      timestamp,
      git,
      environment,
      dataset: {
        tier: options.tier,
        seed: manifest.seed,
        manifestHash: manifest.manifestHash,
        anchor: manifest.anchor,
        anchorDriftHours: Math.round(anchorDriftHours * 1_000) / 1_000,
        dateSpreadDays: manifest.configured.dateSpreadDays,
        expectedTables: manifest.expected.tables,
        countsBefore,
        countsAfter,
        databaseUnchanged,
      },
      configuration: {
        tabs: options.tabs,
        projectScopes: options.projectScopes,
        ranges: options.ranges,
        warmups: options.warmups,
        measuredRuns: options.measuredRuns,
        baseUrl: options.baseUrl,
        sequentialRequests: true,
        matrixCellCount: cells.length,
      },
      contractCanaries,
      cells: cellResults,
      summary: summarizeResults(cellResults),
      warnings,
    };
    const output = await writeResults(options.outputDirectory, result);

    console.log(`[benchmark] JSON: ${output.jsonPath}`);
    console.log(`[benchmark] Markdown: ${output.markdownPath}`);
    console.log(
      `[benchmark] cells=${result.summary.totalCells}, ` +
        `passed=${result.summary.passedCells}, failed=${result.summary.failedCells}`,
    );

    if (
      result.summary.failedCells > 0 ||
      failedCanaries.length > 0 ||
      !databaseUnchanged
    ) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[benchmark] ${redactSensitiveText(message)}`);
  process.exitCode = 1;
});
