import type {
  BenchmarkEnvironmentMetadata,
  BenchmarkProjectScope,
  BenchmarkRange,
  BenchmarkRunResult,
  BenchmarkStatistics,
  BenchmarkTableCounts,
  BenchmarkTab,
  BenchmarkTier,
} from "./benchmark-types";

export const ANALYTICS_QUERY_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
] as const;

export type AnalyticsQueryId = (typeof ANALYTICS_QUERY_IDS)[number];

export interface AnalyticsQueryDefinition {
  id: AnalyticsQueryId;
  key: string;
  module: string;
  label: string;
  tabs: BenchmarkTab[];
  source: string;
  sourceStatementIndex: number;
  supportedScopes: BenchmarkProjectScope[];
  supportedRanges: BenchmarkRange[];
}

export interface ExplainTarget {
  id: string;
  queryId: AnalyticsQueryId;
  projectScope: BenchmarkProjectScope;
  range: BenchmarkRange;
  allTimeGranularity: "day" | "month" | null;
}

export interface ExplainPlanScan {
  nodeType: string;
  relationName: string | null;
  alias: string | null;
  indexName: string | null;
  actualRows: number | null;
  actualLoops: number | null;
  rowsRemovedByFilter: number;
  filter: string | null;
  indexCondition: string | null;
}

export interface ExplainPlanSort {
  method: string | null;
  spaceUsedKb: number | null;
  spaceType: string | null;
  sortKeys: string[];
}

export interface ExplainPlanHash {
  buckets: number | null;
  batches: number | null;
  originalBatches: number | null;
  peakMemoryKb: number | null;
}

export interface ExplainPlanSummary {
  planningMs: number;
  executionMs: number;
  totalCost: number | null;
  actualRows: number | null;
  actualLoops: number | null;
  planRows: number | null;
  nodeTypes: Record<string, number>;
  planShapeHash: string;
  dominantNode: string;
  sequentialScanCount: number;
  indexScanCount: number;
  bitmapScanCount: number;
  nestedLoopCount: number;
  rowsRemovedByFilter: number;
  buffers: {
    sharedHit: number;
    sharedRead: number;
    sharedDirtied: number;
    sharedWritten: number;
    tempRead: number;
    tempWritten: number;
  };
  scans: ExplainPlanScan[];
  sorts: ExplainPlanSort[];
  hashes: ExplainPlanHash[];
}

export interface ExplainSample {
  phase: "priming" | "measured";
  iteration: number;
  summary: ExplainPlanSummary;
  planJson: unknown;
}

export interface ExplainTargetResult extends ExplainTarget {
  query: AnalyticsQueryDefinition;
  customDates: { from: string; to: string } | null;
  sqlShapeHash: string;
  sqlCapture: "production-prisma-template";
  primingSamples: ExplainSample[];
  measuredSamples: ExplainSample[];
  planningMs: BenchmarkStatistics;
  executionMs: BenchmarkStatistics;
  bufferStatistics: {
    sharedHit: BenchmarkStatistics;
    sharedRead: BenchmarkStatistics;
    tempRead: BenchmarkStatistics;
    tempWritten: BenchmarkStatistics;
  };
  representativePlan: ExplainPlanSummary;
}

export interface ExplainRunConfiguration {
  queryIds: AnalyticsQueryId[];
  projectScopes: BenchmarkProjectScope[];
  ranges: BenchmarkRange[];
  primingRuns: number;
  measuredRuns: number;
  targetCount: number;
  sequentialTargets: true;
  transactionMode: "read-only-rollback";
}

export interface ExplainRunResult {
  schemaVersion: "1.0.0";
  runId: string;
  timestamp: string;
  git: {
    commitSha: string;
    branch: string;
    dirty: boolean;
  };
  environment: BenchmarkEnvironmentMetadata;
  dataset: {
    tier: BenchmarkTier;
    seed: number;
    manifestHash: string;
    anchor: string;
    anchorDriftHours: number;
    dateSpreadDays: number;
    expectedTables: BenchmarkTableCounts;
    countsBefore: BenchmarkTableCounts;
    countsAfter: BenchmarkTableCounts;
    databaseUnchanged: boolean;
  };
  configuration: ExplainRunConfiguration;
  queryInventory: AnalyticsQueryDefinition[];
  targets: ExplainTargetResult[];
  summary: {
    totalTargets: number;
    totalPrimingPlans: number;
    totalMeasuredPlans: number;
    queriesCovered: AnalyticsQueryId[];
  };
  warnings: string[];
}

export interface CuratedHttpCell {
  id: string;
  tab: BenchmarkTab;
  projectScope: BenchmarkProjectScope;
  range: BenchmarkRange;
  firstRunDurationMs: number | null;
  latencyMs: BenchmarkStatistics | null;
  payloadBytes: BenchmarkStatistics | null;
  statusCounts: Record<string, number>;
  correctnessPassed: boolean;
  failed: boolean;
}

export interface CuratedExplainTarget {
  id: string;
  queryId: AnalyticsQueryId;
  queryKey: string;
  module: string;
  label: string;
  tabs: BenchmarkTab[];
  source: string;
  projectScope: BenchmarkProjectScope;
  range: BenchmarkRange;
  allTimeGranularity: "day" | "month" | null;
  sqlShapeHash: string;
  planningMs: BenchmarkStatistics;
  executionMs: BenchmarkStatistics;
  bufferStatistics: ExplainTargetResult["bufferStatistics"];
  representativePlan: ExplainPlanSummary;
}

export interface CuratedAnalyticsBaseline {
  schemaVersion: "1.0.0";
  baselineId: string;
  createdAt: string;
  measurementOnly: true;
  git: ExplainRunResult["git"];
  environment: BenchmarkEnvironmentMetadata;
  dataset: {
    tier: "medium";
    seed: number;
    manifestHash: string;
    anchor: string;
    dateSpreadDays: number;
    expectedTables: BenchmarkTableCounts;
    httpCountsBefore: BenchmarkTableCounts;
    httpCountsAfter: BenchmarkTableCounts;
    explainCountsBefore: BenchmarkTableCounts;
    explainCountsAfter: BenchmarkTableCounts;
    databaseUnchanged: boolean;
  };
  http: {
    sourceRunId: string;
    configuration: BenchmarkRunResult["configuration"];
    contractCanaries: BenchmarkRunResult["contractCanaries"];
    cells: CuratedHttpCell[];
    summary: BenchmarkRunResult["summary"];
    warnings: string[];
  };
  explain: {
    sourceRunId: string;
    configuration: ExplainRunConfiguration;
    targets: CuratedExplainTarget[];
    warnings: string[];
  };
  provisionalBudgets: {
    tab: Record<BenchmarkTab, { medianMs: number; p95Ms: number }>;
    singleQueryP95Ms: number;
    payloadBytes: number;
  };
  knownLimitations: string[];
}

export interface BaselineComparisonCell {
  id: string;
  baselineMedianMs: number | null;
  candidateMedianMs: number | null;
  medianDeltaPercent: number | null;
  baselineP95Ms: number | null;
  candidateP95Ms: number | null;
  p95DeltaPercent: number | null;
  baselinePayloadBytes: number | null;
  candidatePayloadBytes: number | null;
  payloadDeltaPercent: number | null;
  medianOutsideVarianceBand: boolean;
  p95OutsideVarianceBand: boolean;
}

export interface BaselineComparisonPlan {
  id: string;
  baselineExecutionMedianMs: number | null;
  candidateExecutionMedianMs: number | null;
  executionDeltaPercent: number | null;
  planShapeChanged: boolean;
  baselinePlanShapeHash: string | null;
  candidatePlanShapeHash: string | null;
}

export interface BaselineComparisonResult {
  schemaVersion: "1.0.0";
  generatedAt: string;
  baselineId: string;
  candidateId: string;
  compatible: boolean;
  datasetManifestMatches: boolean;
  environmentCompatible: boolean;
  warnings: string[];
  addedCells: string[];
  removedCells: string[];
  addedExplainTargets: string[];
  removedExplainTargets: string[];
  cells: BaselineComparisonCell[];
  plans: BaselineComparisonPlan[];
  varianceGuidance: {
    medianPercent: 15;
    p95Percent: 25;
    coldInformationalOnly: true;
  };
}
