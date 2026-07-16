import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type BaselineComparisonCell,
  type BaselineComparisonPlan,
  type BaselineComparisonResult,
  type CuratedAnalyticsBaseline,
} from "./explain-types";

interface CompareCliOptions {
  help: boolean;
  baselinePath: string | null;
  candidatePath: string | null;
  outputBase: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
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

function parseCli(args: string[]): CompareCliOptions {
  let help = false;
  let baselinePath: string | null = null;
  let candidatePath: string | null = null;
  let outputBase: string | null = null;

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
    const baseline = readOptionValue(args, index, "--baseline");
    if (baseline) {
      baselinePath = path.resolve(baseline.value);
      index += baseline.consumed;
      continue;
    }
    const candidate = readOptionValue(args, index, "--candidate");
    if (candidate) {
      candidatePath = path.resolve(candidate.value);
      index += candidate.consumed;
      continue;
    }
    const output = readOptionValue(args, index, "--output");
    if (output) {
      outputBase = path.resolve(output.value).replace(/\.(json|md)$/i, "");
      index += output.consumed;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!help && (!baselinePath || !candidatePath)) {
    throw new Error("--baseline and --candidate are required.");
  }
  return { help, baselinePath, candidatePath, outputBase };
}

function helpText(): string {
  return `EventPulse analytics baseline comparison

Usage:
  bun run bench:compare -- --baseline=<baseline.json> --candidate=<candidate.json> [options]

Options:
  --baseline PATH       Curated baseline JSON
  --candidate PATH      Curated candidate JSON
  --output PATH         Optional output basename for JSON and Markdown
  --help, -h            Show this help

Compatibility:
  Manifest mismatches are rejected with exit code 2. Environment drift is
  reported and makes the comparison directional rather than gating.`;
}

function validateBaseline(value: unknown, label: string): CuratedAnalyticsBaseline {
  if (
    !isRecord(value) ||
    value.schemaVersion !== "1.0.0" ||
    typeof value.baselineId !== "string" ||
    value.measurementOnly !== true ||
    !isRecord(value.git) ||
    !isRecord(value.environment) ||
    !isRecord(value.dataset) ||
    !isRecord(value.http) ||
    !Array.isArray(value.http.cells) ||
    !isRecord(value.explain) ||
    !Array.isArray(value.explain.targets)
  ) {
    throw new Error(`${label} is not a supported curated analytics baseline.`);
  }
  return value as unknown as CuratedAnalyticsBaseline;
}

async function loadBaseline(filePath: string, label: string) {
  const source = await readFile(filePath, "utf8");
  return validateBaseline(JSON.parse(source) as unknown, label);
}

function deltaPercent(baseline: number | null, candidate: number | null) {
  if (baseline === null || candidate === null || baseline === 0) {
    return baseline === 0 && candidate === 0 ? 0 : null;
  }
  return Math.round(((candidate - baseline) / baseline) * 100_000) / 1_000;
}

function compareEnvironment(
  baseline: CuratedAnalyticsBaseline,
  candidate: CuratedAnalyticsBaseline,
): string[] {
  const warnings: string[] = [];
  const pairs: Array<[string, string | null, string | null]> = [
    ["Bun version", baseline.environment.runtime.bunVersion, candidate.environment.runtime.bunVersion],
    [
      "Node compatibility version",
      baseline.environment.runtime.nodeCompatibilityVersion,
      candidate.environment.runtime.nodeCompatibilityVersion,
    ],
    [
      "PostgreSQL server version",
      baseline.environment.postgres.serverVersion,
      candidate.environment.postgres.serverVersion,
    ],
    ["PostgreSQL timezone", baseline.environment.postgres.timezone, candidate.environment.postgres.timezone],
    ["PostgreSQL work_mem", baseline.environment.postgres.workMem, candidate.environment.postgres.workMem],
    [
      "PostgreSQL shared_buffers",
      baseline.environment.postgres.sharedBuffers,
      candidate.environment.postgres.sharedBuffers,
    ],
    [
      "CPU model",
      baseline.environment.operatingSystem.cpuModel,
      candidate.environment.operatingSystem.cpuModel,
    ],
    [
      "OS architecture",
      baseline.environment.operatingSystem.architecture,
      candidate.environment.operatingSystem.architecture,
    ],
  ];
  for (const [name, left, right] of pairs) {
    if (left !== right) warnings.push(`${name} differs (${left ?? "unknown"} vs ${right ?? "unknown"}).`);
  }
  return warnings;
}

function compareCells(
  baseline: CuratedAnalyticsBaseline,
  candidate: CuratedAnalyticsBaseline,
): { cells: BaselineComparisonCell[]; added: string[]; removed: string[] } {
  const baselineById = new Map(baseline.http.cells.map((cell) => [cell.id, cell]));
  const candidateById = new Map(candidate.http.cells.map((cell) => [cell.id, cell]));
  const ids = [...new Set([...baselineById.keys(), ...candidateById.keys()])].sort();
  const added = ids.filter((id) => !baselineById.has(id));
  const removed = ids.filter((id) => !candidateById.has(id));
  const cells: BaselineComparisonCell[] = [];

  for (const id of ids) {
    const left = baselineById.get(id);
    const right = candidateById.get(id);
    if (!left || !right) continue;
    const baselineMedianMs = left.latencyMs?.median ?? null;
    const candidateMedianMs = right.latencyMs?.median ?? null;
    const medianDeltaPercent = deltaPercent(baselineMedianMs, candidateMedianMs);
    const baselineP95Ms = left.latencyMs?.p95 ?? null;
    const candidateP95Ms = right.latencyMs?.p95 ?? null;
    const p95DeltaPercent = deltaPercent(baselineP95Ms, candidateP95Ms);
    const baselinePayloadBytes = left.payloadBytes?.median ?? null;
    const candidatePayloadBytes = right.payloadBytes?.median ?? null;
    cells.push({
      id,
      baselineMedianMs,
      candidateMedianMs,
      medianDeltaPercent,
      baselineP95Ms,
      candidateP95Ms,
      p95DeltaPercent,
      baselinePayloadBytes,
      candidatePayloadBytes,
      payloadDeltaPercent: deltaPercent(baselinePayloadBytes, candidatePayloadBytes),
      medianOutsideVarianceBand:
        medianDeltaPercent !== null && Math.abs(medianDeltaPercent) > 15,
      p95OutsideVarianceBand:
        p95DeltaPercent !== null && Math.abs(p95DeltaPercent) > 25,
    });
  }
  return { cells, added, removed };
}

function comparePlans(
  baseline: CuratedAnalyticsBaseline,
  candidate: CuratedAnalyticsBaseline,
): { plans: BaselineComparisonPlan[]; added: string[]; removed: string[] } {
  const baselineById = new Map(
    baseline.explain.targets.map((target) => [target.id, target]),
  );
  const candidateById = new Map(
    candidate.explain.targets.map((target) => [target.id, target]),
  );
  const ids = [...new Set([...baselineById.keys(), ...candidateById.keys()])].sort();
  const added = ids.filter((id) => !baselineById.has(id));
  const removed = ids.filter((id) => !candidateById.has(id));
  const plans: BaselineComparisonPlan[] = [];

  for (const id of ids) {
    const left = baselineById.get(id);
    const right = candidateById.get(id);
    if (!left || !right) continue;
    plans.push({
      id,
      baselineExecutionMedianMs: left.executionMs.median,
      candidateExecutionMedianMs: right.executionMs.median,
      executionDeltaPercent: deltaPercent(
        left.executionMs.median,
        right.executionMs.median,
      ),
      planShapeChanged:
        left.representativePlan.planShapeHash !==
        right.representativePlan.planShapeHash,
      baselinePlanShapeHash: left.representativePlan.planShapeHash,
      candidatePlanShapeHash: right.representativePlan.planShapeHash,
    });
  }
  return { plans, added, removed };
}

function buildComparison(
  baseline: CuratedAnalyticsBaseline,
  candidate: CuratedAnalyticsBaseline,
): BaselineComparisonResult {
  const datasetManifestMatches =
    baseline.dataset.manifestHash === candidate.dataset.manifestHash;
  const environmentWarnings = compareEnvironment(baseline, candidate);
  const environmentCompatible = environmentWarnings.length === 0;
  const warnings = [...environmentWarnings];
  if (!datasetManifestMatches) {
    warnings.unshift(
      "Dataset manifest hashes differ; latency and plan deltas are not apples-to-apples and were not calculated.",
    );
  }
  if (baseline.dataset.seed !== candidate.dataset.seed) {
    warnings.push("Dataset seeds differ.");
  }
  if (baseline.dataset.dateSpreadDays !== candidate.dataset.dateSpreadDays) {
    warnings.push("Dataset date spreads differ.");
  }
  if (baseline.git.dirty || candidate.git.dirty) {
    warnings.push("At least one baseline was captured from a dirty working tree.");
  }

  const cellComparison = datasetManifestMatches
    ? compareCells(baseline, candidate)
    : { cells: [], added: [] as string[], removed: [] as string[] };
  const planComparison = datasetManifestMatches
    ? comparePlans(baseline, candidate)
    : { plans: [], added: [] as string[], removed: [] as string[] };

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    baselineId: baseline.baselineId,
    candidateId: candidate.baselineId,
    compatible: datasetManifestMatches,
    datasetManifestMatches,
    environmentCompatible,
    warnings,
    addedCells: cellComparison.added,
    removedCells: cellComparison.removed,
    addedExplainTargets: planComparison.added,
    removedExplainTargets: planComparison.removed,
    cells: cellComparison.cells,
    plans: planComparison.plans,
    varianceGuidance: {
      medianPercent: 15,
      p95Percent: 25,
      coldInformationalOnly: true,
    },
  };
}

function format(value: number | null): string {
  return value === null ? "—" : value.toFixed(3);
}

function renderMarkdown(result: BaselineComparisonResult): string {
  const notableCells = result.cells.filter(
    (cell) => cell.medianOutsideVarianceBand || cell.p95OutsideVarianceBand,
  );
  const changedPlans = result.plans.filter((plan) => plan.planShapeChanged);
  const lines = [
    `# Analytics Baseline Comparison`,
    "",
    `- Baseline: \`${result.baselineId}\``,
    `- Candidate: \`${result.candidateId}\``,
    `- Dataset compatible: ${result.datasetManifestMatches ? "yes" : "NO"}`,
    `- Environment compatible: ${result.environmentCompatible ? "yes" : "no — directional only"}`,
    "- Variance guidance: median ±15%, p95 ±25%; first-run/cold values are informational only.",
    "",
    "## Warnings",
    "",
    ...(result.warnings.length > 0
      ? result.warnings.map((warning) => `- ${warning}`)
      : ["- None."]),
    "",
    "## HTTP Cells Outside Variance Guidance",
    "",
    "| Cell | Baseline median | Candidate median | Median Δ | Baseline p95 | Candidate p95 | p95 Δ | Payload Δ |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...(notableCells.length > 0
      ? notableCells.map(
          (cell) =>
            `| ${cell.id} | ${format(cell.baselineMedianMs)} | ${format(cell.candidateMedianMs)} | ` +
            `${format(cell.medianDeltaPercent)}% | ${format(cell.baselineP95Ms)} | ` +
            `${format(cell.candidateP95Ms)} | ${format(cell.p95DeltaPercent)}% | ` +
            `${format(cell.payloadDeltaPercent)}% |`,
        )
      : ["| None | — | — | — | — | — | — | — |"]),
    "",
    "## Plan Shape Changes",
    "",
    ...(changedPlans.length > 0
      ? changedPlans.map(
          (plan) =>
            `- ${plan.id}: ${plan.baselinePlanShapeHash} → ${plan.candidatePlanShapeHash}`,
        )
      : ["- None."]),
    "",
    `Added/removed HTTP cells: ${result.addedCells.length}/${result.removedCells.length}.`,
    `Added/removed EXPLAIN targets: ${result.addedExplainTargets.length}/${result.removedExplainTargets.length}.`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseCli(process.argv.slice(2));
  if (options.help) {
    console.log(helpText());
    return;
  }
  if (!options.baselinePath || !options.candidatePath) {
    throw new Error("--baseline and --candidate are required.");
  }
  const [baseline, candidate] = await Promise.all([
    loadBaseline(options.baselinePath, "Baseline"),
    loadBaseline(options.candidatePath, "Candidate"),
  ]);
  const result = buildComparison(baseline, candidate);
  const markdown = renderMarkdown(result);
  console.log(markdown);

  if (options.outputBase) {
    await mkdir(path.dirname(options.outputBase), { recursive: true });
    await Promise.all([
      writeFile(`${options.outputBase}.json`, `${JSON.stringify(result, null, 2)}\n`, "utf8"),
      writeFile(`${options.outputBase}.md`, markdown, "utf8"),
    ]);
  }
  if (!result.compatible) process.exitCode = 2;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[benchmark] comparison failed: ${message}`);
  process.exitCode = 1;
});
