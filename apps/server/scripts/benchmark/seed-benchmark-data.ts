import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import {
  ADD_TO_CART_ALIASES,
  CHECKOUT_ALIASES,
  COMMERCE_FRICTION_ALIASES,
  PRODUCT_VIEW_ALIASES,
} from "../../src/analytics/shared/aliases";
import {
  assertBenchmarkEnvironment,
  BENCHMARK_TENANT_EMAILS,
} from "./guard";

type TierName = "small" | "medium" | "large";
type Rng = () => number;
type JourneyType =
  | "browse_only"
  | "product_interest"
  | "cart_abandonment"
  | "checkout_abandonment"
  | "payment_failure"
  | "successful_purchase"
  | "friction";

type TierConfig = {
  projects: number;
  productsPerProject: number;
  categoriesPerProject: number;
  customers: number;
  sessions: number;
  approximateEvents: number;
  dateSpreadDays: number;
  seed: number;
};

type SeedProject = {
  id: string;
  apiKeyId: string;
  index: number;
  name: string;
  products: Product[];
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
};

type GenerationStats = {
  customers: number;
  sessions: number;
  events: number;
  eventNames: Record<string, number>;
};

type TableCounts = {
  users: number;
  projects: number;
  apiKeys: number;
  events: number;
  alerts: number;
  alertTriggers: number;
};

const TIER_CONFIGS: Record<TierName, TierConfig> = {
  small: {
    projects: 3,
    productsPerProject: 40,
    categoriesPerProject: 8,
    customers: 2_000,
    sessions: 6_000,
    approximateEvents: 30_000,
    dateSpreadDays: 45,
    seed: 501,
  },
  medium: {
    projects: 5,
    productsPerProject: 200,
    categoriesPerProject: 15,
    customers: 30_000,
    sessions: 110_000,
    approximateEvents: 550_000,
    dateSpreadDays: 90,
    seed: 502,
  },
  large: {
    projects: 8,
    productsPerProject: 600,
    categoriesPerProject: 25,
    customers: 250_000,
    sessions: 950_000,
    approximateEvents: 5_000_000,
    dateSpreadDays: 400,
    seed: 503,
  },
};

const SECONDARY_CONFIG: TierConfig = {
  projects: 1,
  productsPerProject: 20,
  categoriesPerProject: 5,
  customers: 100,
  sessions: 200,
  approximateEvents: 1_000,
  dateSpreadDays: 45,
  seed: 9_001,
};

const JOURNEY_WEIGHTS: readonly [JourneyType, number][] = [
  ["browse_only", 0.55],
  ["product_interest", 0.2],
  ["cart_abandonment", 0.1],
  ["checkout_abandonment", 0.06],
  ["payment_failure", 0.02],
  ["successful_purchase", 0.03],
  ["friction", 0.04],
];

const GENERIC_DISCOVERY_EVENTS = [
  "page_viewed",
  "category_viewed",
  "search_performed",
] as const;

const PROPERTY_KEYS = [
  "page_path",
  "referrer_type",
  "device_type",
  "browser",
  "os",
  "country_code",
  "region",
  "campaign_source",
  "campaign_medium",
  "campaign_name",
  "experiment_id",
  "experiment_variant",
  "search_query",
  "search_results_count",
  "category",
  "product_id",
  "product_name",
  "quantity",
  "cart_value",
  "order_id",
  "amount",
  "currency",
  "coupon_code",
  "delivery_fee",
  "eta_minutes",
] as const;

const PRODUCT_EVENT_NAMES = new Set<string>([
  ...PRODUCT_VIEW_ALIASES,
  ...ADD_TO_CART_ALIASES,
  ...CHECKOUT_ALIASES,
  "cart_viewed",
  "payment_attempted",
  "payment_failed",
  "purchase_completed",
  "payment_completed",
  "item_out_of_stock",
  "item_unavailable",
]);
const VIEW_OR_CART_EVENT_NAMES = new Set<string>([
  ...PRODUCT_VIEW_ALIASES,
  ...ADD_TO_CART_ALIASES,
  "cart_viewed",
]);
const PURCHASE_EVENT_NAMES = new Set<string>([
  "purchase_completed",
  "payment_completed",
]);
const CHECKOUT_EVENT_NAMES = new Set<string>([
  ...CHECKOUT_ALIASES,
  "payment_attempted",
  "payment_failed",
]);
const FRICTION_EVENT_NAMES = Object.values(COMMERCE_FRICTION_ALIASES).flat();
const BATCH_SIZE = 10_000;
const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;
// Benchmark-only fixed salt keeps account rows deterministic across reseeds.
const BENCHMARK_PASSWORD_SALT = "$2a$10$N9qo8uLOickgx2ZMRZoMye";
const MANIFEST_DIRECTORY = path.resolve(
  __dirname,
  "../../../../benchmarks",
);
const MANIFEST_PATH = path.join(MANIFEST_DIRECTORY, "dataset-manifest.json");

function createRng(seed: number): Rng {
  let state = seed >>> 0;

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseTier(): TierName {
  const equalsArgument = process.argv.find((argument) =>
    argument.startsWith("--tier="),
  );
  const tierIndex = process.argv.indexOf("--tier");
  const value = equalsArgument?.slice("--tier=".length) ??
    (tierIndex >= 0 ? process.argv[tierIndex + 1] : undefined);

  if (value !== "small" && value !== "medium" && value !== "large") {
    throw new Error("--tier=small|medium|large is required.");
  }

  return value;
}

function shouldAppendSecondaryTenant(): boolean {
  if (process.argv.includes("--no-append-tier-user")) {
    return false;
  }

  const argument = process.argv.find((value) =>
    value.startsWith("--append-tier-user="),
  );

  return argument ? argument.slice("--append-tier-user=".length) !== "false" : true;
}

function assertSeedInputs(): string {
  if (process.env.CONFIRM_RESET_BENCHMARK !== "true") {
    throw new Error(
      "CONFIRM_RESET_BENCHMARK=true is required before resetting benchmark tenants.",
    );
  }

  const password = process.env.BENCHMARK_USER_PASSWORD;

  if (!password) {
    throw new Error("BENCHMARK_USER_PASSWORD is required.");
  }

  return password;
}

function createPrismaClient(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { pool, prisma };
}

function distributeTotal(total: number, count: number): number[] {
  const weights = Array.from({ length: count }, (_, index) =>
    index === 0 ? 1.5 : 1,
  );
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map((weight) => (total * weight) / weightTotal);
  const distributed = raw.map(Math.floor);
  let remainder = total - distributed.reduce((sum, value) => sum + value, 0);

  const remainderOrder = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);

  for (const entry of remainderOrder) {
    if (remainder === 0) {
      break;
    }

    distributed[entry.index] += 1;
    remainder -= 1;
  }

  return distributed;
}

function selectJourney(rng: Rng): JourneyType {
  const value = rng();
  let cumulative = 0;

  for (const [journey, weight] of JOURNEY_WEIGHTS) {
    cumulative += weight;
    if (value < cumulative) {
      return journey;
    }
  }

  return "friction";
}

function createWeightedDays(
  minimum: number,
  maximum: number,
  spreadDays: number,
): { days: number[]; cumulativeWeights: number[]; totalWeight: number } {
  const days: number[] = [];
  const cumulativeWeights: number[] = [];
  const weeklyWeights = [0.82, 0.88, 0.97, 1.04, 1.12, 1.28, 1.18];
  const spikeDays = new Set([
    4,
    Math.max(5, Math.floor(spreadDays * 0.45)),
    Math.max(6, Math.floor(spreadDays * 0.8)),
  ]);
  let totalWeight = 0;

  for (let day = minimum; day <= maximum; day += 1) {
    const weeklyWeight = weeklyWeights[day % weeklyWeights.length] ?? 1;
    const spikeWeight = spikeDays.has(day) ? 2.8 : 1;
    totalWeight += weeklyWeight * spikeWeight;
    days.push(day);
    cumulativeWeights.push(totalWeight);
  }

  return { days, cumulativeWeights, totalWeight };
}

function selectWeightedDay(
  distribution: ReturnType<typeof createWeightedDays>,
  rng: Rng,
): number {
  const target = rng() * distribution.totalWeight;
  let low = 0;
  let high = distribution.cumulativeWeights.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((distribution.cumulativeWeights[middle] ?? 0) < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return distribution.days[low] ?? distribution.days[0] ?? 1;
}

function createTimestampSampler(spreadDays: number, rng: Rng) {
  const recentMaximum = Math.min(29, spreadDays - 1);
  const recentDays = createWeightedDays(1, recentMaximum, spreadDays);
  const olderMinimum = Math.min(30, spreadDays - 1);
  const olderDays = createWeightedDays(olderMinimum, spreadDays - 1, spreadDays);

  return (sessionOrdinal: number) => {
    const bucket = sessionOrdinal % 10;

    if (bucket === 0) {
      return rng() * DAY_MS;
    }

    const distribution = bucket < 3 ? recentDays : olderDays;
    const day = selectWeightedDay(distribution, rng);
    return (day + rng()) * DAY_MS;
  };
}

function createProducts(
  tenantKey: string,
  projectIndex: number,
  productCount: number,
  categoryCount: number,
): Product[] {
  return Array.from({ length: productCount }, (_, productIndex) => {
    const categoryIndex = productIndex % categoryCount;
    const sequence = productIndex + 1;

    return {
      id: `bench_product_${tenantKey}_${projectIndex + 1}_${sequence}`,
      name: `Benchmark Product ${projectIndex + 1}-${sequence}`,
      category: `Benchmark Category ${categoryIndex + 1}`,
      price: money(8.99 + ((productIndex * 17 + projectIndex * 11) % 190)),
    };
  });
}

function createDeterministicApiKey(seed: number, tenantKey: string, index: number) {
  const token = createHash("sha256")
    .update(`${seed}:${tenantKey}:${index}`)
    .digest("hex");
  const rawKey = `ep_live_${token.slice(0, 40)}`;

  return {
    keyHash: createHash("sha256").update(rawKey).digest("hex"),
    keyPrefix: rawKey.slice(0, 16),
    maskedKey: `${rawKey.slice(0, 16)}${"*".repeat(12)}${rawKey.slice(-4)}`,
  };
}

async function resetBenchmarkTenantData(
  prisma: PrismaClient,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return {
      alertTriggers: 0,
      alerts: 0,
      events: 0,
      apiKeys: 0,
      projects: 0,
    };
  }

  const alertIds = (
    await prisma.alert.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    })
  ).map((alert) => alert.id);

  return prisma.$transaction(
    async (transaction) => {
      const alertTriggers = alertIds.length
        ? await transaction.alertTrigger.deleteMany({
            where: { alertId: { in: alertIds } },
          })
        : { count: 0 };
      const alerts = await transaction.alert.deleteMany({
        where: { userId: { in: userIds } },
      });
      const events = await transaction.event.deleteMany({
        where: { userId: { in: userIds } },
      });
      const apiKeys = await transaction.apiKey.deleteMany({
        where: { userId: { in: userIds } },
      });
      const projects = await transaction.project.deleteMany({
        where: { userId: { in: userIds } },
      });

      return {
        alertTriggers: alertTriggers.count,
        alerts: alerts.count,
        events: events.count,
        apiKeys: apiKeys.count,
        projects: projects.count,
      };
    },
    { timeout: 10 * 60_000 },
  );
}

async function upsertBenchmarkUser(
  prisma: PrismaClient,
  input: {
    email: string;
    id: string;
    name: string;
    passwordHash: string;
    anchor: Date;
  },
) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      passwordHash: input.passwordHash,
      createdAt: input.anchor,
      updatedAt: input.anchor,
    },
    create: {
      id: input.id,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: input.anchor,
      updatedAt: input.anchor,
    },
    select: { id: true, email: true },
  });
}

async function createTenantProjects(
  prisma: PrismaClient,
  input: {
    userId: string;
    tenantKey: string;
    tier: TierName;
    config: TierConfig;
    anchor: Date;
    canary: boolean;
  },
): Promise<SeedProject[]> {
  const projects: SeedProject[] = [];

  for (let index = 0; index < input.config.projects; index += 1) {
    const isCanary = input.canary && index === 0;
    const name = isCanary
      ? "bench-canary"
      : input.tenantKey === "secondary"
        ? "bench-secondary-store"
        : `bench-${input.tier}-store-${index + 1}`;
    const id = `bench-project-${input.tenantKey}-${input.tier}-${index + 1}`;
    const createdAt = new Date(input.anchor.getTime() - (index + 1) * DAY_MS);
    const project = await prisma.project.create({
      data: {
        id,
        name,
        domain: `${name}.eventpulse.local`,
        description: `Deterministic ${input.tier} benchmark project`,
        userId: input.userId,
        createdAt,
        updatedAt: input.anchor,
      },
      select: { id: true },
    });
    const apiKeyId = `bench-api-key-${input.tenantKey}-${input.tier}-${index + 1}`;
    const key = createDeterministicApiKey(
      input.config.seed,
      input.tenantKey,
      index,
    );

    await prisma.apiKey.create({
      data: {
        id: apiKeyId,
        name: `${name} benchmark key`,
        ...key,
        permissions: "Ingest Events",
        userId: input.userId,
        projectId: project.id,
        lastUsedAt: input.anchor,
        createdAt,
        updatedAt: input.anchor,
      },
    });

    projects.push({
      id: project.id,
      apiKeyId,
      index,
      name,
      products: createProducts(
        input.tenantKey,
        index,
        input.config.productsPerProject,
        input.config.categoriesPerProject,
      ),
    });
  }

  return projects;
}

function buildJourneyEventNames(journey: JourneyType, rng: Rng): string[] {
  const events: string[] = [...GENERIC_DISCOVERY_EVENTS];

  if (rng() < 0.8) {
    events.push("product_list_viewed");
  }

  if (journey === "browse_only") {
    return events;
  }

  events.push(pick(PRODUCT_VIEW_ALIASES, rng));

  if (journey === "product_interest") {
    return events;
  }

  if (journey === "friction") {
    events.push(pick(FRICTION_EVENT_NAMES, rng), "page_viewed");
    return events;
  }

  events.push(pick(ADD_TO_CART_ALIASES, rng), "cart_viewed");

  if (journey === "cart_abandonment") {
    return events;
  }

  events.push(pick(CHECKOUT_ALIASES, rng));

  if (journey === "checkout_abandonment") {
    return events;
  }

  events.push("payment_attempted");

  if (journey === "payment_failure") {
    events.push("payment_failed");
    return events;
  }

  events.push("purchase_completed", "payment_completed");
  return events;
}

function createFillerValue(
  key: (typeof PROPERTY_KEYS)[number],
  input: {
    product: Product;
    project: SeedProject;
    rng: Rng;
    sessionIndex: number;
  },
): Prisma.InputJsonValue {
  const { product, project, rng, sessionIndex } = input;

  switch (key) {
    case "page_path":
      return `/products/${product.id}`;
    case "referrer_type":
      return pick(["direct", "search", "campaign", "category"], rng);
    case "device_type":
      return pick(["mobile", "desktop", "tablet"], rng);
    case "browser":
      return pick(["chrome", "safari", "firefox", "edge"], rng);
    case "os":
      return pick(["ios", "android", "macos", "windows"], rng);
    case "country_code":
      return pick(["IN", "US", "GB", "SG", "AE"], rng);
    case "region":
      return pick(["west", "north", "south", "east"], rng);
    case "campaign_source":
      return pick(["organic", "search", "social", "email"], rng);
    case "campaign_medium":
      return pick(["none", "cpc", "social", "newsletter"], rng);
    case "campaign_name":
      return `benchmark_campaign_${(sessionIndex % 12) + 1}`;
    case "experiment_id":
      return `bench_exp_${(sessionIndex % 6) + 1}`;
    case "experiment_variant":
      return sessionIndex % 2 === 0 ? "control" : "variant_a";
    case "search_query":
      return `benchmark ${product.category.toLowerCase()}`;
    case "search_results_count":
      return 8 + (sessionIndex % 53);
    case "category":
      return product.category;
    case "product_id":
      return product.id;
    case "product_name":
      return product.name;
    case "quantity":
      return 1 + (sessionIndex % 4);
    case "cart_value":
      return money(product.price * (1 + (sessionIndex % 4)));
    case "order_id":
      return `bench_order_${project.index + 1}_${sessionIndex + 1}`;
    case "amount":
      return money(product.price * (1 + (sessionIndex % 4)));
    case "currency":
      return "USD";
    case "coupon_code":
      return sessionIndex % 3 === 0 ? "BENCH10" : "NONE";
    case "delivery_fee":
      return money(1.99 + Math.floor(rng() * 5));
    case "eta_minutes":
      return 15 + (sessionIndex % 46);
  }
}

function createProperties(input: {
  eventName: string;
  product: Product;
  project: SeedProject;
  rng: Rng;
  sessionIndex: number;
  orderId: string;
  quantity: number;
  amount: number;
}): Prisma.InputJsonObject {
  const normalizedName = input.eventName.toLowerCase();
  const properties: Record<string, Prisma.InputJsonValue> = {
    page_path: `/products/${input.product.id}`,
    device_type: pick(["mobile", "desktop", "tablet"], input.rng),
  };
  const blockedFillerKeys = new Set<string>();
  const isProductEvent = PRODUCT_EVENT_NAMES.has(normalizedName);
  const isViewOrCartEvent = VIEW_OR_CART_EVENT_NAMES.has(normalizedName);
  const isPurchaseEvent = PURCHASE_EVENT_NAMES.has(normalizedName);
  const isCheckoutEvent = CHECKOUT_EVENT_NAMES.has(normalizedName);

  if (normalizedName === "category_viewed") {
    properties.category = input.product.category;
  }

  if (normalizedName === "search_performed") {
    properties.search_query = `benchmark ${input.product.category.toLowerCase()}`;
    properties.search_results_count = 8 + (input.sessionIndex % 53);
  }

  if (isProductEvent) {
    if (isPurchaseEvent && input.rng() < 0.1) {
      properties.productId = input.product.id;
      blockedFillerKeys.add("product_id");
    } else {
      properties.product_id = input.product.id;
    }

    if (input.rng() >= 0.2) {
      properties.product_name = input.product.name;
    } else {
      blockedFillerKeys.add("product_name");
    }

    if (input.rng() >= 0.3) {
      properties.quantity = input.quantity;
    } else {
      blockedFillerKeys.add("quantity");
    }

    if (!isViewOrCartEvent || input.rng() >= 0.12) {
      properties.category = input.product.category;
    } else {
      blockedFillerKeys.add("category");
    }
  }

  if (
    ADD_TO_CART_ALIASES.includes(
      normalizedName as (typeof ADD_TO_CART_ALIASES)[number],
    ) ||
    normalizedName === "cart_viewed" ||
    CHECKOUT_ALIASES.includes(normalizedName as (typeof CHECKOUT_ALIASES)[number]) ||
    isCheckoutEvent
  ) {
    properties.cart_value = input.amount;
    properties.currency = "USD";
  }

  if (isPurchaseEvent) {
    properties.order_id = input.orderId;
    properties.amount = input.amount;
    properties.currency = "USD";
    properties.payment_method = pick(["card", "wallet", "bank_transfer"], input.rng);
    properties.status = "succeeded";

    if (input.rng() < 0.6) {
      properties.items = [
        {
          product_id: input.product.id,
          product_name: input.product.name,
          category: input.product.category,
          quantity: input.quantity,
          price: input.product.price,
        },
      ];
    }
  }

  if (normalizedName === "payment_failed") {
    properties.failure_reason = pick(
      ["declined", "timeout", "insufficient_funds"],
      input.rng,
    );
  }

  if (normalizedName === "delivery_fee_shown") {
    properties.delivery_fee = money(1.99 + Math.floor(input.rng() * 5));
    properties.currency = "USD";
  }

  if (normalizedName === "eta_shown") {
    properties.eta_minutes = 15 + (input.sessionIndex % 46);
  }

  if (normalizedName === "coupon_applied") {
    properties.coupon_code = "BENCH10";
  }

  if (
    normalizedName === "item_out_of_stock" ||
    normalizedName === "item_unavailable"
  ) {
    properties.inventory_status = "unavailable";
  }

  const targetWidth = 2 + Math.floor(input.rng() * 19);
  const startIndex = Math.floor(input.rng() * PROPERTY_KEYS.length);

  for (let offset = 0; offset < PROPERTY_KEYS.length; offset += 1) {
    if (Object.keys(properties).length >= targetWidth) {
      break;
    }

    const key = PROPERTY_KEYS[(startIndex + offset) % PROPERTY_KEYS.length];
    if (
      key &&
      properties[key] === undefined &&
      !blockedFillerKeys.has(key)
    ) {
      properties[key] = createFillerValue(key, input);
    }
  }

  return properties;
}

function maybeMixCase(eventName: string, rng: Rng): string {
  return rng() < 0.03
    ? `${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`
    : eventName;
}

async function seedTenantEvents(
  prisma: PrismaClient,
  input: {
    userId: string;
    tenantKey: string;
    tier: TierName;
    config: TierConfig;
    projects: SeedProject[];
    anchor: Date;
    seed: number;
    reuseCustomersAcrossProjects: boolean;
  },
): Promise<GenerationStats> {
  const rng = createRng(input.seed);
  const sampleTimestampOffset = createTimestampSampler(
    input.config.dateSpreadDays,
    rng,
  );
  const sessionCounts = distributeTotal(
    input.config.sessions,
    input.projects.length,
  );
  const sharedCustomerCount = input.reuseCustomersAcrossProjects
    ? Math.floor(input.config.customers * 0.1)
    : 0;
  const localCustomerCounts = distributeTotal(
    input.config.customers - sharedCustomerCount,
    input.projects.length,
  );
  const sharedCustomerIds = Array.from(
    { length: sharedCustomerCount },
    (_, index) => `bench_customer_shared_${index + 1}`,
  );
  const eventNames: Record<string, number> = {};
  let eventBatch: Prisma.EventCreateManyInput[] = [];
  let eventCount = 0;
  let globalSessionIndex = 0;

  const flush = async () => {
    if (eventBatch.length === 0) {
      return;
    }

    await prisma.event.createMany({ data: eventBatch });
    eventBatch = [];

    if (eventCount > 0 && eventCount % 250_000 < BATCH_SIZE) {
      console.log(`[benchmark] inserted ${eventCount.toLocaleString()} events`);
    }
  };

  for (const project of input.projects) {
    const sessionCount = sessionCounts[project.index] ?? 0;
    const localCustomerCount = localCustomerCounts[project.index] ?? 0;
    const localCustomerIds = Array.from(
      { length: localCustomerCount },
      (_, index) =>
        `bench_customer_${input.tenantKey}_${project.index + 1}_${index + 1}`,
    );
    const customerPool = [...sharedCustomerIds, ...localCustomerIds];

    for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
      const sharedCustomer =
        sharedCustomerIds.length > 0 && sessionIndex < sharedCustomerIds.length;
      const customerId = sharedCustomer
        ? sharedCustomerIds[sessionIndex % sharedCustomerIds.length]
        : customerPool[sessionIndex % customerPool.length];
      const sessionId = `bench_session_${input.tenantKey}_${project.index + 1}_${sessionIndex + 1}`;
      const product = pick(project.products, rng);
      const journey = selectJourney(rng);
      const eventSequence = buildJourneyEventNames(journey, rng);
      const sessionOffset = sampleTimestampOffset(globalSessionIndex);
      const sessionStart = input.anchor.getTime() - sessionOffset;
      const quantity = 1 + Math.floor(rng() * 4);
      const deliveryFee = money(1.99 + Math.floor(rng() * 5));
      const amount = money(product.price * quantity + deliveryFee);
      const orderId = `bench_order_${input.tenantKey}_${project.index + 1}_${sessionIndex + 1}`;

      for (let sequenceIndex = 0; sequenceIndex < eventSequence.length; sequenceIndex += 1) {
        const canonicalEventName = eventSequence[sequenceIndex] ?? "page_viewed";
        const eventName = maybeMixCase(canonicalEventName, rng);
        const createdAt = new Date(
          Math.min(
            input.anchor.getTime() - 1_000,
            sessionStart + sequenceIndex * 90_000,
          ),
        );
        const rowSessionId = rng() < 0.05 ? null : sessionId;
        const rowCustomerId = rng() < 0.08 ? null : customerId;

        eventBatch.push({
          id: `bench-event-${input.tenantKey}-${input.tier}-${globalSessionIndex + 1}-${sequenceIndex + 1}`,
          name: eventName,
          properties: createProperties({
            eventName: canonicalEventName,
            product,
            project,
            rng,
            sessionIndex,
            orderId,
            quantity,
            amount,
          }),
          userId: input.userId,
          projectId: project.id,
          apiKeyId: project.apiKeyId,
          createdAt,
          idempotencyKey: null,
          ipAddress: null,
          userAgent: "EventPulseBenchmark/1.0",
          customerId: rowCustomerId,
          sessionId: rowSessionId,
        });
        eventNames[eventName] = (eventNames[eventName] ?? 0) + 1;
        eventCount += 1;

        if (eventBatch.length >= BATCH_SIZE) {
          await flush();
        }
      }

      globalSessionIndex += 1;
    }
  }

  await flush();

  return {
    customers: input.config.customers,
    sessions: input.config.sessions,
    events: eventCount,
    eventNames,
  };
}

function mergeEventCounts(...counts: Record<string, number>[]) {
  const merged: Record<string, number> = {};

  for (const count of counts) {
    for (const [name, value] of Object.entries(count)) {
      merged[name] = (merged[name] ?? 0) + value;
    }
  }

  return Object.fromEntries(
    Object.entries(merged).sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function countBenchmarkRows(
  prisma: PrismaClient,
  userIds: string[],
): Promise<{ tables: TableCounts; eventNames: Record<string, number> }> {
  const alertIds = (
    await prisma.alert.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    })
  ).map((alert) => alert.id);
  const [users, projects, apiKeys, events, alerts, alertTriggers, groupedEvents] =
    await Promise.all([
      prisma.user.count({ where: { id: { in: userIds } } }),
      prisma.project.count({ where: { userId: { in: userIds } } }),
      prisma.apiKey.count({ where: { userId: { in: userIds } } }),
      prisma.event.count({ where: { userId: { in: userIds } } }),
      prisma.alert.count({ where: { userId: { in: userIds } } }),
      alertIds.length
        ? prisma.alertTrigger.count({ where: { alertId: { in: alertIds } } })
        : Promise.resolve(0),
      prisma.event.groupBy({
        by: ["name"],
        where: { userId: { in: userIds } },
        _count: { _all: true },
      }),
    ]);

  return {
    tables: { users, projects, apiKeys, events, alerts, alertTriggers },
    eventNames: Object.fromEntries(
      groupedEvents
        .map((event) => [event.name, event._count._all] as const)
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

function assertCountsMatch(expected: TableCounts, actual: TableCounts) {
  for (const key of Object.keys(expected) as (keyof TableCounts)[]) {
    if (expected[key] !== actual[key]) {
      throw new Error(
        `Benchmark count mismatch for ${key}: expected ${expected[key]}, found ${actual[key]}.`,
      );
    }
  }
}

async function writeManifest(input: {
  tier: TierName;
  config: TierConfig;
  anchor: Date;
  appendSecondaryTenant: boolean;
  expectedTables: TableCounts;
  actualTables: TableCounts;
  expectedEventNames: Record<string, number>;
  actualEventNames: Record<string, number>;
  primaryStats: GenerationStats;
  secondaryStats: GenerationStats | null;
}) {
  const hashInput = {
    tier: input.tier,
    seed: input.config.seed,
    expectedTables: input.expectedTables,
    actualTables: input.actualTables,
    expectedEventNames: input.expectedEventNames,
    actualEventNames: input.actualEventNames,
  };
  const manifestHash = createHash("sha256")
    .update(JSON.stringify(hashInput))
    .digest("hex");
  const manifest = {
    version: 1,
    tier: input.tier,
    seed: input.config.seed,
    anchor: input.anchor.toISOString(),
    manifestHash,
    configured: {
      projects: input.config.projects,
      productsPerProject: input.config.productsPerProject,
      categoriesPerProject: input.config.categoriesPerProject,
      customers: input.config.customers,
      sessions: input.config.sessions,
      approximateEvents: input.config.approximateEvents,
      dateSpreadDays: input.config.dateSpreadDays,
      appendSecondaryTenant: input.appendSecondaryTenant,
    },
    expected: {
      tables: input.expectedTables,
      eventNames: input.expectedEventNames,
      logical: {
        primaryCustomers: input.primaryStats.customers,
        primarySessions: input.primaryStats.sessions,
        secondaryCustomers: input.secondaryStats?.customers ?? 0,
        secondarySessions: input.secondaryStats?.sessions ?? 0,
      },
    },
    actual: {
      tables: input.actualTables,
      eventNames: input.actualEventNames,
    },
  };

  await mkdir(MANIFEST_DIRECTORY, { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return manifest;
}

async function main() {
  const tier = parseTier();
  const appendSecondaryTenant = shouldAppendSecondaryTenant();
  const target = assertBenchmarkEnvironment({ operation: "seed", tier });
  const password = assertSeedInputs();
  const config = TIER_CONFIGS[tier];
  const anchor = new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS);
  const startedAt = Date.now();
  const { pool, prisma } = createPrismaClient(target.databaseUrl);

  try {
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: [...BENCHMARK_TENANT_EMAILS] } },
      select: { id: true },
    });
    const resetCounts = await resetBenchmarkTenantData(
      prisma,
      existingUsers.map((user) => user.id),
    );

    if (!appendSecondaryTenant) {
      await prisma.user.deleteMany({
        where: { email: BENCHMARK_TENANT_EMAILS[1] },
      });
    }

    console.log(`[benchmark] reset ${JSON.stringify(resetCounts)}`);

    const passwordHash = await bcrypt.hash(password, BENCHMARK_PASSWORD_SALT);
    const primaryUser = await upsertBenchmarkUser(prisma, {
      id: "bench-user-primary",
      name: "EventPulse Benchmark",
      email: BENCHMARK_TENANT_EMAILS[0],
      passwordHash,
      anchor,
    });
    const secondaryUser = appendSecondaryTenant
      ? await upsertBenchmarkUser(prisma, {
          id: "bench-user-secondary",
          name: "EventPulse Benchmark Secondary",
          email: BENCHMARK_TENANT_EMAILS[1],
          passwordHash,
          anchor,
        })
      : null;

    const primaryProjects = await createTenantProjects(prisma, {
      userId: primaryUser.id,
      tenantKey: "primary",
      tier,
      config,
      anchor,
      canary: true,
    });
    const primaryStats = await seedTenantEvents(prisma, {
      userId: primaryUser.id,
      tenantKey: "primary",
      tier,
      config,
      projects: primaryProjects,
      anchor,
      seed: config.seed,
      reuseCustomersAcrossProjects: true,
    });

    let secondaryStats: GenerationStats | null = null;

    if (secondaryUser) {
      const secondaryProjects = await createTenantProjects(prisma, {
        userId: secondaryUser.id,
        tenantKey: "secondary",
        tier,
        config: SECONDARY_CONFIG,
        anchor,
        canary: false,
      });
      secondaryStats = await seedTenantEvents(prisma, {
        userId: secondaryUser.id,
        tenantKey: "secondary",
        tier,
        config: SECONDARY_CONFIG,
        projects: secondaryProjects,
        anchor,
        seed: config.seed + SECONDARY_CONFIG.seed,
        reuseCustomersAcrossProjects: false,
      });
    }

    await pool.query("ANALYZE");

    const activeUserIds = [primaryUser.id];
    if (secondaryUser) {
      activeUserIds.push(secondaryUser.id);
    }

    const actual = await countBenchmarkRows(prisma, activeUserIds);
    const expectedEventNames = mergeEventCounts(
      primaryStats.eventNames,
      secondaryStats?.eventNames ?? {},
    );
    const expectedTables: TableCounts = {
      users: activeUserIds.length,
      projects: config.projects + (secondaryUser ? SECONDARY_CONFIG.projects : 0),
      apiKeys: config.projects + (secondaryUser ? SECONDARY_CONFIG.projects : 0),
      events: primaryStats.events + (secondaryStats?.events ?? 0),
      alerts: 0,
      alertTriggers: 0,
    };

    assertCountsMatch(expectedTables, actual.tables);

    if (JSON.stringify(expectedEventNames) !== JSON.stringify(actual.eventNames)) {
      throw new Error("Benchmark per-event-name counts do not match inserted counts.");
    }

    const manifest = await writeManifest({
      tier,
      config,
      anchor,
      appendSecondaryTenant,
      expectedTables,
      actualTables: actual.tables,
      expectedEventNames,
      actualEventNames: actual.eventNames,
      primaryStats,
      secondaryStats,
    });
    const durationSeconds = ((Date.now() - startedAt) / 1_000).toFixed(1);

    console.log(`[benchmark] manifest=${MANIFEST_PATH}`);
    console.log(`[benchmark] manifestHash=${manifest.manifestHash}`);
    console.log(`[benchmark] counts=${JSON.stringify(actual.tables)}`);
    console.log(`[benchmark] completed in ${durationSeconds}s`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
