import "dotenv/config";
import { prisma } from "../src/config/prisma";
import {
  generateApiKey,
  getApiKeyDisplayValues,
  hashApiKey,
} from "../src/utils/apiKey";

const EVENT_NAMES = [
  "product_viewed",
  "add_to_cart",
  "checkout_started",
  "purchase_completed",
  "payment_completed",
  "payment_failed",
  "item_out_of_stock",
  "item_unavailable",
  "delivery_fee_shown",
  "eta_shown",
  "coupon_applied",
  "remove_from_cart",
  "search_performed",
  "category_viewed",
] as const;

type EventName = (typeof EVENT_NAMES)[number];

type JourneyType =
  | "browse_only"
  | "product_interest"
  | "cart_abandonment"
  | "checkout_abandonment"
  | "payment_failure"
  | "successful_purchase"
  | "quick_commerce_friction";

type JourneyWeights = Record<JourneyType, number>;

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
};

type ProjectSeed = {
  name: string;
  domain: string;
  description: string;
  customerPrefix: string;
  sessionPrefix: string;
  customerCount: number;
  currency: string;
  source: string;
  products: Product[];
  journeyWeights: JourneyWeights;
  paymentMethods: string[];
  categories: string[];
};

type SeededEvent = {
  name: EventName;
  properties: Record<string, unknown>;
  userId: string;
  projectId: string;
  apiKeyId: string;
  createdAt: Date;
  // Top-level shopper identity, matching the ingestion API standard.
  customerId: string;
  sessionId: string;
};

type JourneyContext = {
  customerId: string;
  sessionId: string;
  product: Product;
  cartSize: number;
  cartValue: number;
  deliveryFee: number;
  etaMinutes: number;
  orderId: string;
  paymentMethod: string;
};

type SessionStats = {
  purchaseSessions: number;
  abandonedCartSessions: number;
  checkoutAbandonedSessions: number;
};

const DEMO_PROJECTS: ProjectSeed[] = [
  {
    name: "QuickCart Grocery",
    domain: "quickcart-grocery.local",
    description: "Quick-commerce grocery storefront with delivery fee and ETA friction.",
    customerPrefix: "quickcart_customer",
    sessionPrefix: "quickcart_session",
    customerCount: 700,
    currency: "USD",
    source: "Web SDK",
    products: [
      { id: "qc-banana-001", name: "Organic Bananas", category: "Fresh Produce", price: 3.99 },
      { id: "qc-milk-002", name: "A2 Whole Milk", category: "Dairy", price: 5.49 },
      { id: "qc-bread-003", name: "Sourdough Bread", category: "Bakery", price: 6.25 },
      { id: "qc-eggs-004", name: "Free Range Eggs", category: "Dairy", price: 7.2 },
      { id: "qc-snack-005", name: "Sea Salt Chips", category: "Snacks", price: 4.75 },
    ],
    journeyWeights: {
      browse_only: 55,
      product_interest: 20,
      cart_abandonment: 10,
      checkout_abandonment: 6,
      payment_failure: 2,
      successful_purchase: 3,
      quick_commerce_friction: 4,
    },
    paymentMethods: ["card", "wallet", "upi", "cash_on_delivery"],
    categories: ["Fresh Produce", "Dairy", "Bakery", "Snacks", "Beverages"],
  },
  {
    name: "UrbanStyle Fashion",
    domain: "urbanstyle-fashion.local",
    description: "Fashion storefront with high browsing, coupons, and cart removals.",
    customerPrefix: "urbanstyle_customer",
    sessionPrefix: "urbanstyle_session",
    customerCount: 850,
    currency: "USD",
    source: "Mobile SDK",
    products: [
      { id: "us-denim-001", name: "Relaxed Denim Jacket", category: "Outerwear", price: 89 },
      { id: "us-sneaker-002", name: "Courtline Sneakers", category: "Footwear", price: 124 },
      { id: "us-dress-003", name: "Linen Summer Dress", category: "Dresses", price: 76 },
      { id: "us-tee-004", name: "Supima Cotton Tee", category: "Tops", price: 32 },
      { id: "us-bag-005", name: "Mini Crossbody Bag", category: "Accessories", price: 58 },
    ],
    journeyWeights: {
      browse_only: 62,
      product_interest: 20,
      cart_abandonment: 10,
      checkout_abandonment: 3,
      payment_failure: 1,
      successful_purchase: 2,
      quick_commerce_friction: 2,
    },
    paymentMethods: ["card", "wallet", "paypal", "buy_now_pay_later"],
    categories: ["Outerwear", "Footwear", "Dresses", "Tops", "Accessories"],
  },
  {
    name: "FreshMart Express",
    domain: "freshmart-express.local",
    description: "Express grocery marketplace with strong conversion and stock issues.",
    customerPrefix: "freshmart_customer",
    sessionPrefix: "freshmart_session",
    customerCount: 650,
    currency: "USD",
    source: "Server API",
    products: [
      { id: "fm-avocado-001", name: "Hass Avocados", category: "Fresh Produce", price: 6.99 },
      { id: "fm-coffee-002", name: "Cold Brew Pack", category: "Beverages", price: 11.49 },
      { id: "fm-yogurt-003", name: "Greek Yogurt Cups", category: "Dairy", price: 8.5 },
      { id: "fm-chicken-004", name: "Herb Roast Chicken", category: "Prepared Foods", price: 13.75 },
      { id: "fm-berry-005", name: "Blueberry Pint", category: "Fresh Produce", price: 5.99 },
    ],
    journeyWeights: {
      browse_only: 55,
      product_interest: 18,
      cart_abandonment: 7,
      checkout_abandonment: 3,
      payment_failure: 1,
      successful_purchase: 8,
      quick_commerce_friction: 8,
    },
    paymentMethods: ["card", "wallet", "upi"],
    categories: ["Fresh Produce", "Beverages", "Dairy", "Prepared Foods"],
  },
];

const RESET_PROJECT_NAMES = [
  ...DEMO_PROJECTS.map((project) => project.name),
  "Production App",
  "Web Dashboard",
  "Mobile App",
  "Staging Environment",
  "Staging App",
  "Marketing Website",
  "Payments Service",
  "Analytics Portal",
  "Project B",
  "Test Project",
  "NoViews Store",
  "Session Test Store",
];

function getSeedUserEmail(): string | undefined {
  const emailFlagIndex = process.argv.findIndex((arg) => arg === "--email");
  const emailFromSplitFlag =
    emailFlagIndex >= 0 ? process.argv[emailFlagIndex + 1] : undefined;
  const emailFromEqualsFlag = process.argv
    .find((arg) => arg.startsWith("--email="))
    ?.slice("--email=".length);

  return process.env.SEED_USER_EMAIL ?? emailFromEqualsFlag ?? emailFromSplitFlag;
}

function assertCanSeed(email: string | undefined) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed commerce demo data when NODE_ENV=production.");
  }

  if (!email) {
    throw new Error(
      "SEED_USER_EMAIL is required. Example: SEED_USER_EMAIL=you@example.com CONFIRM_RESET_COMMERCE_DEMO=true bun run seed:commerce-demo",
    );
  }

  if (process.env.CONFIRM_RESET_COMMERCE_DEMO !== "true") {
    throw new Error(
      "CONFIRM_RESET_COMMERCE_DEMO=true is required because this script deletes demo/test projects for the selected local user.",
    );
  }
}

function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rng = createRng(20260709);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function createEmptyEventCounts(): Record<EventName, number> {
  return Object.fromEntries(EVENT_NAMES.map((name) => [name, 0])) as Record<
    EventName,
    number
  >;
}

function formatSequenceId(prefix: string, value: number, digits: number): string {
  return `${prefix}_${value.toString().padStart(digits, "0")}`;
}

function getSessionCountForCustomer(): number {
  const roll = rng();

  if (roll < 0.985) {
    return 1;
  }

  if (roll < 0.997) {
    return 2;
  }

  if (roll < 0.999) {
    return 3;
  }

  return 4;
}

function pickJourneyType(weights: JourneyWeights): JourneyType {
  const entries = Object.entries(weights) as [JourneyType, number][];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rng() * totalWeight;

  for (const [journeyType, weight] of entries) {
    cursor -= weight;

    if (cursor <= 0) {
      return journeyType;
    }
  }

  return entries[entries.length - 1]?.[0] ?? "browse_only";
}

function chanceFor(project: ProjectSeed, signal: "coupon" | "delivery" | "eta" | "remove" | "search" | "stock" | "paymentComplete") {
  const chances: Record<ProjectSeed["name"], Record<typeof signal, number>> = {
    "QuickCart Grocery": {
      coupon: 0.1,
      delivery: 0.75,
      eta: 0.75,
      remove: 0.28,
      search: 0.16,
      stock: 0.12,
      paymentComplete: 0.22,
    },
    "UrbanStyle Fashion": {
      coupon: 0.45,
      delivery: 0.18,
      eta: 0.2,
      remove: 0.7,
      search: 0.28,
      stock: 0.06,
      paymentComplete: 0.18,
    },
    "FreshMart Express": {
      coupon: 0.12,
      delivery: 0.35,
      eta: 0.45,
      remove: 0.18,
      search: 0.12,
      stock: 0.35,
      paymentComplete: 0.3,
    },
  };

  return chances[project.name][signal];
}

function maybePush(events: EventName[], eventName: EventName, probability: number) {
  if (rng() < probability) {
    events.push(eventName);
  }
}

function buildJourney(project: ProjectSeed, journeyType: JourneyType): EventName[] {
  switch (journeyType) {
    case "browse_only": {
      const events: EventName[] = ["product_viewed", "category_viewed"];
      maybePush(events, "search_performed", chanceFor(project, "search"));
      return events;
    }
    case "product_interest": {
      const events: EventName[] = ["product_viewed", "product_viewed"];
      maybePush(events, "item_out_of_stock", chanceFor(project, "stock"));
      return events;
    }
    case "cart_abandonment": {
      const events: EventName[] = ["product_viewed", "add_to_cart"];
      maybePush(events, "coupon_applied", chanceFor(project, "coupon"));
      maybePush(events, "remove_from_cart", chanceFor(project, "remove"));
      return events;
    }
    case "checkout_abandonment": {
      const events: EventName[] = ["product_viewed", "add_to_cart"];
      maybePush(events, "coupon_applied", chanceFor(project, "coupon"));
      events.push("checkout_started");
      maybePush(events, "delivery_fee_shown", chanceFor(project, "delivery"));
      maybePush(events, "eta_shown", chanceFor(project, "eta"));
      return events;
    }
    case "payment_failure":
      return ["product_viewed", "add_to_cart", "checkout_started", "payment_failed"];
    case "successful_purchase": {
      const events: EventName[] = ["product_viewed", "add_to_cart"];
      maybePush(events, "coupon_applied", chanceFor(project, "coupon"));
      events.push("checkout_started", "purchase_completed");
      maybePush(events, "payment_completed", chanceFor(project, "paymentComplete"));
      return events;
    }
    case "quick_commerce_friction":
      return [
        "product_viewed",
        "item_out_of_stock",
        "item_unavailable",
        "eta_shown",
        "delivery_fee_shown",
      ];
  }
}

function createdAtForSession(projectName: string, journey: EventName[]): Date {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  const isPaymentFailureSpike = journey.includes("payment_failed") && rng() < 0.45;
  const isFreshMartStockSpike =
    projectName === "FreshMart Express" &&
    (journey.includes("item_out_of_stock") || journey.includes("item_unavailable")) &&
    rng() < 0.55;

  if (isPaymentFailureSpike || isFreshMartStockSpike) {
    return new Date(now - 30 * 60 * 1000 - rng() * oneDay);
  }

  const spikeDaysAgo = pick([4, 12, 21]);
  if (rng() < 0.14) {
    return new Date(now - spikeDaysAgo * oneDay - rng() * oneDay);
  }

  return new Date(now - 30 * 60 * 1000 - rng() * 30 * oneDay);
}

function createJourneyContext(project: ProjectSeed, customerId: string, sessionId: string): JourneyContext {
  const product = pick(project.products);
  const cartSize = Math.max(1, Math.floor(rng() * 7) + 1);
  const cartValue = money(product.price * cartSize + rng() * 35);
  const deliveryFee = money(project.name === "QuickCart Grocery" ? 4 + rng() * 8 : rng() * 6);
  const etaMinutes = Math.floor(12 + rng() * (project.name === "QuickCart Grocery" ? 48 : 28));

  return {
    customerId,
    sessionId,
    product,
    cartSize,
    cartValue,
    deliveryFee,
    etaMinutes,
    orderId: `ord_${Math.floor(rng() * 1_000_000).toString(16)}`,
    paymentMethod: pick(project.paymentMethods),
  };
}

function eventProperties(project: ProjectSeed, eventName: EventName, context: JourneyContext) {
  // customerId/sessionId now live top-level on the Event row (matching the
  // ingestion API standard), so they are no longer duplicated into properties.
  switch (eventName) {
    case "product_viewed":
      return {
        product_id: context.product.id,
        product_name: context.product.name,
        category: context.product.category,
        price: context.product.price,
        currency: project.currency,
        source: pick(["home_feed", "search", "category_page", project.source]),
        ...(project.name === "UrbanStyle Fashion"
          ? { size: pick(["XS", "S", "M", "L", "XL"]), color: pick(["black", "navy", "sage", "cream"]) }
          : {}),
      };
    case "add_to_cart":
      return {
        product_id: context.product.id,
        cart_value: context.cartValue,
        quantity: Math.max(1, Math.floor(rng() * 4) + 1),
        category: context.product.category,
      };
    case "checkout_started":
      return {
        cart_value: context.cartValue,
        cart_size: context.cartSize,
        delivery_fee: context.deliveryFee,
        eta_minutes: context.etaMinutes,
      };
    case "purchase_completed":
    case "payment_completed":
      return {
        order_id: context.orderId,
        amount: context.cartValue,
        currency: project.currency,
        cart_size: context.cartSize,
        payment_method: context.paymentMethod,
      };
    case "payment_failed":
      return {
        amount: context.cartValue,
        payment_method: context.paymentMethod,
        reason: pick(["card_declined", "insufficient_funds", "gateway_timeout", "wallet_auth_failed"]),
      };
    case "item_out_of_stock":
      return {
        product_id: context.product.id,
        product_name: context.product.name,
        category: context.product.category,
        reason: "out_of_stock",
      };
    case "item_unavailable":
      return {
        product_id: context.product.id,
        product_name: context.product.name,
        category: context.product.category,
        reason: pick(["store_closed", "inventory_sync_delay", "delivery_area_unavailable"]),
      };
    case "delivery_fee_shown":
      return {
        cart_value: context.cartValue,
        delivery_fee: context.deliveryFee,
        free_delivery_threshold: project.name === "QuickCart Grocery" ? 35 : 50,
      };
    case "eta_shown":
      return {
        eta_minutes: context.etaMinutes,
        city: pick(["Mumbai", "Bengaluru", "Delhi", "Pune", "Hyderabad"]),
        fulfillment_mode: pick(["instant", "scheduled", "express"]),
      };
    case "coupon_applied":
      return {
        coupon_code: pick(["WELCOME10", "SAVE15", "FRESH20", "STYLE25"]),
        discount_amount: money(4 + rng() * 24),
        cart_value: context.cartValue,
      };
    case "remove_from_cart":
      return {
        product_id: context.product.id,
        product_name: context.product.name,
        category: context.product.category,
        cart_value: context.cartValue,
        reason: pick(["changed_mind", "price_check", "delivery_fee", "size_uncertain"]),
      };
    case "search_performed":
      return {
        query: pick(project.products).name.toLowerCase(),
        results_count: Math.floor(4 + rng() * 80),
        source: project.source,
      };
    case "category_viewed":
      return {
        category: pick(project.categories),
        source: pick(["home_nav", "search", "recommendation", "promo_tile"]),
      };
  }
}

function buildEvents(params: {
  userId: string;
  projectId: string;
  apiKeyId: string;
  project: ProjectSeed;
}) {
  const events: SeededEvent[] = [];
  const counts = createEmptyEventCounts();
  const sessionStats: SessionStats = {
    purchaseSessions: 0,
    abandonedCartSessions: 0,
    checkoutAbandonedSessions: 0,
  };
  let sessionCounter = 0;

  for (let customerIndex = 1; customerIndex <= params.project.customerCount; customerIndex += 1) {
    const customerId = formatSequenceId(params.project.customerPrefix, customerIndex, 4);
    const sessionCount = getSessionCountForCustomer();

    for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
      sessionCounter += 1;

      const sessionId = formatSequenceId(params.project.sessionPrefix, sessionCounter, 6);
      const journeyType = pickJourneyType(params.project.journeyWeights);
      const journey = buildJourney(params.project, journeyType);
      const context = createJourneyContext(params.project, customerId, sessionId);
      const sessionStartedAt = createdAtForSession(params.project.name, journey);

      if (journeyType === "successful_purchase") {
        sessionStats.purchaseSessions += 1;
      }

      if (journeyType === "cart_abandonment") {
        sessionStats.abandonedCartSessions += 1;
      }

      if (journeyType === "checkout_abandonment") {
        sessionStats.checkoutAbandonedSessions += 1;
      }

      for (const [eventIndex, eventName] of journey.entries()) {
        counts[eventName] += 1;
        events.push({
          name: eventName,
          properties: eventProperties(params.project, eventName, context),
          userId: params.userId,
          projectId: params.projectId,
          apiKeyId: params.apiKeyId,
          customerId,
          sessionId,
          createdAt: new Date(
            sessionStartedAt.getTime() + eventIndex * Math.floor(30_000 + rng() * 150_000),
          ),
        });
      }
    }
  }

  return {
    events: events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    counts,
    customerCount: params.project.customerCount,
    sessionCount: sessionCounter,
    sessionStats,
  };
}

async function resetDemoProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      userId,
      name: {
        in: RESET_PROJECT_NAMES,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const projectIds = projects.map((project) => project.id);

  if (projectIds.length === 0) {
    return {
      projectNames: [] as string[],
      deletedAlertTriggers: 0,
      deletedAlerts: 0,
      deletedEvents: 0,
      deletedApiKeys: 0,
      deletedProjects: 0,
    };
  }

  const alerts = await prisma.alert.findMany({
    where: {
      userId,
      projectId: {
        in: projectIds,
      },
    },
    select: {
      id: true,
    },
  });
  const alertIds = alerts.map((alert) => alert.id);

  const deletedAlertTriggers =
    alertIds.length > 0
      ? await prisma.alertTrigger.deleteMany({
          where: {
            alertId: {
              in: alertIds,
            },
          },
        })
      : { count: 0 };
  const deletedAlerts = await prisma.alert.deleteMany({
    where: {
      userId,
      projectId: {
        in: projectIds,
      },
    },
  });
  const deletedEvents = await prisma.event.deleteMany({
    where: {
      userId,
      projectId: {
        in: projectIds,
      },
    },
  });
  const deletedApiKeys = await prisma.apiKey.deleteMany({
    where: {
      userId,
      projectId: {
        in: projectIds,
      },
    },
  });
  const deletedProjects = await prisma.project.deleteMany({
    where: {
      userId,
      id: {
        in: projectIds,
      },
    },
  });

  return {
    projectNames: projects.map((project) => project.name),
    deletedAlertTriggers: deletedAlertTriggers.count,
    deletedAlerts: deletedAlerts.count,
    deletedEvents: deletedEvents.count,
    deletedApiKeys: deletedApiKeys.count,
    deletedProjects: deletedProjects.count,
  };
}

function summarizeFunnel(events: SeededEvent[]) {
  const count = (names: EventName[]) =>
    events.filter((event) => names.includes(event.name)).length;

  return {
    productViewed: count(["product_viewed"]),
    addedToCart: count(["add_to_cart"]),
    checkoutStarted: count(["checkout_started"]),
    purchaseCompleted: count(["purchase_completed", "payment_completed"]),
    paymentFailed: count(["payment_failed"]),
  };
}

async function main() {
  const email = getSeedUserEmail();
  assertCanSeed(email);

  const user = await prisma.user.findUnique({
    where: {
      email: email?.trim().toLowerCase(),
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error(
      `User not found for ${email}. Create the account locally before running the commerce demo seed.`,
    );
  }

  const reset = await resetDemoProjects(user.id);
  const apiKeySecrets: { projectName: string; rawApiKey: string; maskedKey: string }[] = [];
  const projectSummaries: {
    projectName: string;
    apiKeyName: string;
    customerCount: number;
    sessionCount: number;
    totalEvents: number;
    counts: Record<EventName, number>;
    funnel: ReturnType<typeof summarizeFunnel>;
    sessionStats: SessionStats;
  }[] = [];

  for (const projectSeed of DEMO_PROJECTS) {
    const project = await prisma.project.create({
      data: {
        name: projectSeed.name,
        domain: projectSeed.domain,
        description: projectSeed.description,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const rawApiKey = generateApiKey();
    const { keyPrefix, maskedKey } = getApiKeyDisplayValues(rawApiKey);
    const apiKey = await prisma.apiKey.create({
      data: {
        name: `${projectSeed.name} Demo Key`,
        keyHash: hashApiKey(rawApiKey),
        keyPrefix,
        maskedKey,
        permissions: "Ingest Events",
        userId: user.id,
        projectId: project.id,
        lastUsedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
      },
    });

    const seedRun = buildEvents({
      userId: user.id,
      projectId: project.id,
      apiKeyId: apiKey.id,
      project: projectSeed,
    });

    await prisma.event.createMany({
      data: seedRun.events,
    });

    apiKeySecrets.push({
      projectName: project.name,
      rawApiKey,
      maskedKey,
    });
    projectSummaries.push({
      projectName: project.name,
      apiKeyName: apiKey.name,
      customerCount: seedRun.customerCount,
      sessionCount: seedRun.sessionCount,
      totalEvents: seedRun.events.length,
      counts: seedRun.counts,
      funnel: summarizeFunnel(seedRun.events),
      sessionStats: seedRun.sessionStats,
    });
  }

  const totalCustomers = projectSummaries.reduce(
    (sum, project) => sum + project.customerCount,
    0,
  );
  const totalSessions = projectSummaries.reduce(
    (sum, project) => sum + project.sessionCount,
    0,
  );
  const totalEvents = projectSummaries.reduce(
    (sum, project) => sum + project.totalEvents,
    0,
  );
  const totalPurchaseSessions = projectSummaries.reduce(
    (sum, project) => sum + project.sessionStats.purchaseSessions,
    0,
  );
  const totalAbandonedCartSessions = projectSummaries.reduce(
    (sum, project) => sum + project.sessionStats.abandonedCartSessions,
    0,
  );
  const totalCheckoutAbandonedSessions = projectSummaries.reduce(
    (sum, project) => sum + project.sessionStats.checkoutAbandonedSessions,
    0,
  );

  console.log("\nEventPulse commerce demo seed complete.");
  console.log(`User: ${user.email}`);
  console.log("\nReset scope:");
  console.log(
    reset.projectNames.length > 0
      ? `Deleted demo/test projects: ${reset.projectNames.join(", ")}`
      : "No existing demo/test projects found for this user.",
  );
  console.log(
    `Deleted ${reset.deletedProjects} projects, ${reset.deletedApiKeys} API keys, ${reset.deletedEvents} events, ${reset.deletedAlerts} alerts, ${reset.deletedAlertTriggers} alert triggers.`,
  );

  console.log("\nCreated projects and event counts:");
  for (const summary of projectSummaries) {
    console.log(`\n- ${summary.projectName}`);
    console.log(`  API key: ${summary.apiKeyName}`);
    console.log(`  Customers generated: ${summary.customerCount}`);
    console.log(`  Sessions generated: ${summary.sessionCount}`);
    console.log(`  Total events: ${summary.totalEvents}`);
    console.log("  Event counts:");
    for (const [name, count] of Object.entries(summary.counts)) {
      console.log(`    ${name}: ${count}`);
    }
    console.log("  Funnel counts:");
    console.log(`    Product Viewed: ${summary.funnel.productViewed}`);
    console.log(`    Added to Cart: ${summary.funnel.addedToCart}`);
    console.log(`    Checkout Started: ${summary.funnel.checkoutStarted}`);
    console.log(`    Purchase Completed: ${summary.funnel.purchaseCompleted}`);
    console.log(`    Payment Failed: ${summary.funnel.paymentFailed}`);
    console.log("  Session outcomes:");
    console.log(`    Approx purchase sessions: ${summary.sessionStats.purchaseSessions}`);
    console.log(`    Approx abandoned cart sessions: ${summary.sessionStats.abandonedCartSessions}`);
    console.log(
      `    Approx checkout abandoned sessions: ${summary.sessionStats.checkoutAbandonedSessions}`,
    );
  }

  console.log(`\nProjects created: ${projectSummaries.length}`);
  console.log(`API keys created: ${apiKeySecrets.length}`);
  console.log(`Total customers generated: ${totalCustomers}`);
  console.log(`Total sessions generated: ${totalSessions}`);
  console.log(`Total events inserted: ${totalEvents}`);
  console.log(`Approx purchase sessions: ${totalPurchaseSessions}`);
  console.log(`Approx abandoned cart sessions: ${totalAbandonedCartSessions}`);
  console.log(`Approx checkout abandoned sessions: ${totalCheckoutAbandonedSessions}`);
  console.log("\nGenerated API key secrets are local demo only:");
  for (const secret of apiKeySecrets) {
    console.log(`- ${secret.projectName}: ${secret.rawApiKey} (${secret.maskedKey})`);
  }
}

main()
  .catch((error) => {
    console.error("\nCommerce demo seed failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
