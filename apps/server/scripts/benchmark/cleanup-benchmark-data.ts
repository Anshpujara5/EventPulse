import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  assertBenchmarkEnvironment,
  BENCHMARK_TENANT_EMAILS,
} from "./guard";

type CleanupCounts = {
  users: number;
  projects: number;
  apiKeys: number;
  events: number;
  alerts: number;
  alertTriggers: number;
};

function createPrismaClient(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { pool, prisma };
}

async function getTenantScope(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    where: { email: { in: [...BENCHMARK_TENANT_EMAILS] } },
    select: { id: true, email: true },
  });
  const userIds = users.map((user) => user.id);
  const alertIds = userIds.length
    ? (
        await prisma.alert.findMany({
          where: { userId: { in: userIds } },
          select: { id: true },
        })
      ).map((alert) => alert.id)
    : [];

  return { users, userIds, alertIds };
}

async function countTenantRows(
  prisma: PrismaClient,
  scope: Awaited<ReturnType<typeof getTenantScope>>,
): Promise<CleanupCounts> {
  if (scope.userIds.length === 0) {
    return {
      users: 0,
      projects: 0,
      apiKeys: 0,
      events: 0,
      alerts: 0,
      alertTriggers: 0,
    };
  }

  const [projects, apiKeys, events, alerts, alertTriggers] = await Promise.all([
    prisma.project.count({ where: { userId: { in: scope.userIds } } }),
    prisma.apiKey.count({ where: { userId: { in: scope.userIds } } }),
    prisma.event.count({ where: { userId: { in: scope.userIds } } }),
    prisma.alert.count({ where: { userId: { in: scope.userIds } } }),
    scope.alertIds.length
      ? prisma.alertTrigger.count({
          where: { alertId: { in: scope.alertIds } },
        })
      : Promise.resolve(0),
  ]);

  return {
    users: scope.users.length,
    projects,
    apiKeys,
    events,
    alerts,
    alertTriggers,
  };
}

async function deleteTenantRows(
  prisma: PrismaClient,
  scope: Awaited<ReturnType<typeof getTenantScope>>,
): Promise<CleanupCounts> {
  if (scope.userIds.length === 0) {
    return {
      users: 0,
      projects: 0,
      apiKeys: 0,
      events: 0,
      alerts: 0,
      alertTriggers: 0,
    };
  }

  return prisma.$transaction(
    async (transaction) => {
      const alertTriggers = scope.alertIds.length
        ? await transaction.alertTrigger.deleteMany({
            where: { alertId: { in: scope.alertIds } },
          })
        : { count: 0 };
      const alerts = await transaction.alert.deleteMany({
        where: { userId: { in: scope.userIds } },
      });
      const events = await transaction.event.deleteMany({
        where: { userId: { in: scope.userIds } },
      });
      const apiKeys = await transaction.apiKey.deleteMany({
        where: { userId: { in: scope.userIds } },
      });
      const projects = await transaction.project.deleteMany({
        where: { userId: { in: scope.userIds } },
      });
      const users = await transaction.user.deleteMany({
        where: {
          id: { in: scope.userIds },
          email: { in: [...BENCHMARK_TENANT_EMAILS] },
        },
      });

      return {
        users: users.count,
        projects: projects.count,
        apiKeys: apiKeys.count,
        events: events.count,
        alerts: alerts.count,
        alertTriggers: alertTriggers.count,
      };
    },
    { timeout: 10 * 60_000 },
  );
}

async function main() {
  const execute = process.argv.includes("--execute");
  const target = assertBenchmarkEnvironment({
    operation: execute ? "cleanup" : "cleanup-dry-run",
  });

  if (execute && process.env.CONFIRM_BENCHMARK_CLEANUP !== "true") {
    throw new Error(
      "CONFIRM_BENCHMARK_CLEANUP=true is required with --execute.",
    );
  }

  const { pool, prisma } = createPrismaClient(target.databaseUrl);

  try {
    const scope = await getTenantScope(prisma);
    const counts = await countTenantRows(prisma, scope);
    console.log(
      `[benchmark] tenants=${scope.users.map((user) => user.email).join(",") || "none"}`,
    );
    console.log(`[benchmark] dry-run-counts=${JSON.stringify(counts)}`);

    if (!execute) {
      console.log(
        "[benchmark] dry run only; pass --execute with CONFIRM_BENCHMARK_CLEANUP=true to delete these rows.",
      );
      return;
    }

    const deleted = await deleteTenantRows(prisma, scope);
    console.log(`[benchmark] deleted=${JSON.stringify(deleted)}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
