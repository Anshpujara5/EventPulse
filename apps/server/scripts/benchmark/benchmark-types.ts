export const BENCHMARK_TABS = [
  "overview",
  "conversion",
  "products",
  "shoppers",
  "behavior",
] as const;

export const BENCHMARK_PROJECT_SCOPES = ["single", "all"] as const;

export const BENCHMARK_RANGES = [
  "24h",
  "7d",
  "30d",
  "custom-short",
  "custom-long",
  "all",
] as const;

export const BENCHMARK_TIERS = ["small", "medium", "large"] as const;

export type BenchmarkTab = (typeof BENCHMARK_TABS)[number];
export type BenchmarkProjectScope =
  (typeof BENCHMARK_PROJECT_SCOPES)[number];
export type BenchmarkRange = (typeof BENCHMARK_RANGES)[number];
export type BenchmarkTier = (typeof BENCHMARK_TIERS)[number];

export interface BenchmarkTableCounts {
  users: number;
  projects: number;
  apiKeys: number;
  events: number;
  alerts: number;
  alertTriggers: number;
}

export interface BenchmarkDatasetManifest {
  version: number;
  tier: BenchmarkTier;
  seed: number;
  anchor: string;
  manifestHash: string;
  configured: {
    projects: number;
    productsPerProject: number;
    categoriesPerProject: number;
    customers: number;
    sessions: number;
    approximateEvents: number;
    dateSpreadDays: number;
    appendSecondaryTenant: boolean;
  };
  expected: {
    tables: BenchmarkTableCounts;
    eventNames: Record<string, number>;
    logical: {
      primaryCustomers: number;
      primarySessions: number;
      secondaryCustomers: number;
      secondarySessions: number;
    };
  };
  actual: {
    tables: BenchmarkTableCounts;
    eventNames: Record<string, number>;
  };
}

export interface BenchmarkCellDefinition {
  id: string;
  tab: BenchmarkTab;
  projectScope: BenchmarkProjectScope;
  range: BenchmarkRange;
}

export interface BenchmarkCustomDates {
  from: string;
  to: string;
}

export interface BenchmarkStatistics {
  count: number;
  min: number;
  median: number;
  p95: number;
  max: number;
}

export interface BenchmarkRequestSample {
  phase: "warmup" | "measured";
  iteration: number;
  durationMs: number;
  status: number | null;
  payloadBytes: number;
  passed: boolean;
  error?: string;
}

export interface BenchmarkCellResult extends BenchmarkCellDefinition {
  requestPath: string;
  customDates: BenchmarkCustomDates | null;
  warmupSamples: BenchmarkRequestSample[];
  measuredSamples: BenchmarkRequestSample[];
  firstRunDurationMs: number | null;
  latencyMs: BenchmarkStatistics | null;
  payloadBytes: BenchmarkStatistics | null;
  statusCounts: Record<string, number>;
  successCount: number;
  failureCount: number;
  correctness: {
    passed: boolean;
    issues: string[];
  };
  failed: boolean;
}

export interface BenchmarkContractCanary {
  name: "unknown-tab" | "unauthenticated";
  expectedStatus: number;
  actualStatus: number | null;
  durationMs: number;
  passed: boolean;
  error?: string;
}

export interface BenchmarkEnvironmentMetadata {
  runtime: {
    bunVersion: string;
    nodeCompatibilityVersion: string;
    nodeCommandVersion: string | null;
  };
  operatingSystem: {
    platform: string;
    release: string;
    architecture: string;
    cpuModel: string | null;
    logicalCpuCount: number;
    totalMemoryBytes: number;
  };
  postgres: {
    databaseName: string;
    version: string;
    serverVersion: string;
    timezone: string;
    sharedBuffers: string;
    workMem: string;
    effectiveCacheSize: string;
    jit: string;
  };
}

export interface BenchmarkRunConfiguration {
  tabs: BenchmarkTab[];
  projectScopes: BenchmarkProjectScope[];
  ranges: BenchmarkRange[];
  warmups: number;
  measuredRuns: number;
  baseUrl: string;
  sequentialRequests: true;
  matrixCellCount: number;
}

export interface BenchmarkRunResult {
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
  configuration: BenchmarkRunConfiguration;
  contractCanaries: BenchmarkContractCanary[];
  cells: BenchmarkCellResult[];
  summary: {
    totalCells: number;
    passedCells: number;
    failedCells: number;
    totalMeasuredRequests: number;
    successfulMeasuredRequests: number;
    failedMeasuredRequests: number;
  };
  warnings: string[];
}
