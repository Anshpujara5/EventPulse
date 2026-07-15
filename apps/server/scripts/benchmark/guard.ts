export const BENCHMARK_TENANT_EMAILS = [
  "bench@eventpulse.local",
  "bench-secondary@eventpulse.local",
] as const;

type BenchmarkGuardOptions = {
  operation: string;
  tier?: string;
};

export type BenchmarkTarget = {
  databaseUrl: string;
  databaseName: string;
};

export function assertBenchmarkEnvironment({
  operation,
  tier,
}: BenchmarkGuardOptions): BenchmarkTarget {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Benchmark scripts cannot run when NODE_ENV=production.");
  }

  const databaseUrl = process.env.BENCHMARK_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("BENCHMARK_DATABASE_URL is required.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("BENCHMARK_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("BENCHMARK_DATABASE_URL must use PostgreSQL.");
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));

  if (!databaseName.toLowerCase().includes("bench")) {
    throw new Error(
      "Refusing to run: the BENCHMARK_DATABASE_URL database name must contain 'bench'.",
    );
  }

  const target = `${parsedUrl.hostname}/${databaseName}`;
  const tierLabel = tier ? `, tier=${tier}` : "";
  console.log(`[benchmark] target=${target}, operation=${operation}${tierLabel}`);

  return {
    databaseUrl,
    databaseName,
  };
}
