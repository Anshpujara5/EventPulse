import "dotenv/config";
import { prisma } from "../src/config/prisma";
import {
  generateApiKey,
  getApiKeyDisplayValues,
  hashApiKey,
} from "../src/utils/apiKey";

type EventName =
  | "product_viewed"
  | "add_to_cart"
  | "checkout_started"
  | "purchase_completed"
  | "payment_completed"
  | "payment_failed"
  | "item_out_of_stock"
  | "item_unavailable"
  | "delivery_fee_shown"
  | "eta_shown"
  | "coupon_applied"
  | "remove_from_cart"
  | "search_performed"
  | "category_viewed";

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
  currency: string;
  source: string;
  products: Product[];
  eventCounts: Record<EventName, number>;
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
};

const DEMO_PROJECTS: ProjectSeed[] = [
  {
    name: "QuickCart Grocery",
    domain: "quickcart-grocery.local",
    description: "Quick-commerce grocery storefront with delivery fee and ETA friction.",
    currency: "USD",
    source: "Web SDK",
    products: [
      { id: "qc-banana-001", name: "Organic Bananas", category: "Fresh Produce", price: 3.99 },
      { id: "qc-milk-002", name: "A2 Whole Milk", category: "Dairy", price: 5.49 },
      { id: "qc-bread-003", name: "Sourdough Bread", category: "Bakery", price: 6.25 },
      { id: "qc-eggs-004", name: "Free Range Eggs", category: "Dairy", price: 7.2 },
      { id: "qc-snack-005", name: "Sea Salt Chips", category: "Snacks", price: 4.75 },
    ],
    eventCounts: {
      product_viewed: 520,
      add_to_cart: 230,
      checkout_started: 130,
      purchase_completed: 70,
      payment_completed: 20,
      payment_failed: 45,
      item_out_of_stock: 25,
      item_unavailable: 20,
      delivery_fee_shown: 90,
      eta_shown: 110,
      coupon_applied: 35,
      remove_from_cart: 45,
      search_performed: 90,
      category_viewed: 95,
    },
    paymentMethods: ["card", "wallet", "upi", "cash_on_delivery"],
    categories: ["Fresh Produce", "Dairy", "Bakery", "Snacks", "Beverages"],
  },
  {
    name: "UrbanStyle Fashion",
    domain: "urbanstyle-fashion.local",
    description: "Fashion storefront with high browsing, coupons, and cart removals.",
    currency: "USD",
    source: "Mobile SDK",
    products: [
      { id: "us-denim-001", name: "Relaxed Denim Jacket", category: "Outerwear", price: 89 },
      { id: "us-sneaker-002", name: "Courtline Sneakers", category: "Footwear", price: 124 },
      { id: "us-dress-003", name: "Linen Summer Dress", category: "Dresses", price: 76 },
      { id: "us-tee-004", name: "Supima Cotton Tee", category: "Tops", price: 32 },
      { id: "us-bag-005", name: "Mini Crossbody Bag", category: "Accessories", price: 58 },
    ],
    eventCounts: {
      product_viewed: 650,
      add_to_cart: 210,
      checkout_started: 95,
      purchase_completed: 55,
      payment_completed: 15,
      payment_failed: 40,
      item_out_of_stock: 15,
      item_unavailable: 20,
      delivery_fee_shown: 20,
      eta_shown: 25,
      coupon_applied: 150,
      remove_from_cart: 120,
      search_performed: 160,
      category_viewed: 140,
    },
    paymentMethods: ["card", "wallet", "paypal", "buy_now_pay_later"],
    categories: ["Outerwear", "Footwear", "Dresses", "Tops", "Accessories"],
  },
  {
    name: "FreshMart Express",
    domain: "freshmart-express.local",
    description: "Express grocery marketplace with strong conversion and stock issues.",
    currency: "USD",
    source: "Server API",
    products: [
      { id: "fm-avocado-001", name: "Hass Avocados", category: "Fresh Produce", price: 6.99 },
      { id: "fm-coffee-002", name: "Cold Brew Pack", category: "Beverages", price: 11.49 },
      { id: "fm-yogurt-003", name: "Greek Yogurt Cups", category: "Dairy", price: 8.5 },
      { id: "fm-chicken-004", name: "Herb Roast Chicken", category: "Prepared Foods", price: 13.75 },
      { id: "fm-berry-005", name: "Blueberry Pint", category: "Fresh Produce", price: 5.99 },
    ],
    eventCounts: {
      product_viewed: 430,
      add_to_cart: 260,
      checkout_started: 200,
      purchase_completed: 165,
      payment_completed: 30,
      payment_failed: 25,
      item_out_of_stock: 80,
      item_unavailable: 50,
      delivery_fee_shown: 45,
      eta_shown: 70,
      coupon_applied: 45,
      remove_from_cart: 35,
      search_performed: 90,
      category_viewed: 80,
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

function createdAtFor(projectName: string, eventName: EventName): Date {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  const isPaymentFailureSpike = eventName === "payment_failed" && rng() < 0.45;
  const isFreshMartStockSpike =
    projectName === "FreshMart Express" &&
    (eventName === "item_out_of_stock" || eventName === "item_unavailable") &&
    rng() < 0.55;

  if (isPaymentFailureSpike || isFreshMartStockSpike) {
    return new Date(now - rng() * oneDay);
  }

  const spikeDaysAgo = pick([4, 12, 21]);
  if (rng() < 0.14) {
    return new Date(now - spikeDaysAgo * oneDay - rng() * oneDay);
  }

  return new Date(now - rng() * 30 * oneDay);
}

function productProps(project: ProjectSeed) {
  const product = pick(project.products);

  return {
    product_id: product.id,
    product_name: product.name,
    category: product.category,
    price: product.price,
    currency: project.currency,
    source: project.source,
  };
}

function eventProperties(project: ProjectSeed, eventName: EventName) {
  if (rng() < 0.025) {
    return {};
  }

  const product = pick(project.products);
  const cartSize = Math.max(1, Math.floor(rng() * 7) + 1);
  const cartValue = money(product.price * cartSize + rng() * 35);
  const deliveryFee = money(project.name === "QuickCart Grocery" ? 4 + rng() * 8 : rng() * 6);
  const etaMinutes = Math.floor(12 + rng() * (project.name === "QuickCart Grocery" ? 48 : 28));

  switch (eventName) {
    case "product_viewed":
      return {
        ...productProps(project),
        source: pick(["home_feed", "search", "category_page", project.source]),
        ...(project.name === "UrbanStyle Fashion"
          ? { size: pick(["XS", "S", "M", "L", "XL"]), color: pick(["black", "navy", "sage", "cream"]) }
          : {}),
      };
    case "add_to_cart":
      return {
        product_id: product.id,
        cart_value: cartValue,
        quantity: Math.max(1, Math.floor(rng() * 4) + 1),
        category: product.category,
      };
    case "checkout_started":
      return {
        cart_value: cartValue,
        cart_size: cartSize,
        delivery_fee: deliveryFee,
        eta_minutes: etaMinutes,
      };
    case "purchase_completed":
    case "payment_completed":
      return {
        order_id: `ord_${Math.floor(rng() * 1_000_000).toString(16)}`,
        amount: cartValue,
        currency: project.currency,
        cart_size: cartSize,
        payment_method: pick(project.paymentMethods),
      };
    case "payment_failed":
      return {
        amount: cartValue,
        payment_method: pick(project.paymentMethods),
        reason: pick(["card_declined", "insufficient_funds", "gateway_timeout", "wallet_auth_failed"]),
      };
    case "item_out_of_stock":
      return {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        reason: "out_of_stock",
      };
    case "item_unavailable":
      return {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        reason: pick(["store_closed", "inventory_sync_delay", "delivery_area_unavailable"]),
      };
    case "delivery_fee_shown":
      return {
        cart_value: cartValue,
        delivery_fee: deliveryFee,
        free_delivery_threshold: project.name === "QuickCart Grocery" ? 35 : 50,
      };
    case "eta_shown":
      return {
        eta_minutes: etaMinutes,
        city: pick(["Mumbai", "Bengaluru", "Delhi", "Pune", "Hyderabad"]),
        fulfillment_mode: pick(["instant", "scheduled", "express"]),
      };
    case "coupon_applied":
      return {
        coupon_code: pick(["WELCOME10", "SAVE15", "FRESH20", "STYLE25"]),
        discount_amount: money(4 + rng() * 24),
        cart_value: cartValue,
      };
    case "remove_from_cart":
      return {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        cart_value: cartValue,
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

  for (const [eventName, count] of Object.entries(params.project.eventCounts) as [
    EventName,
    number,
  ][]) {
    for (let index = 0; index < count; index += 1) {
      events.push({
        name: eventName,
        properties: eventProperties(params.project, eventName),
        userId: params.userId,
        projectId: params.projectId,
        apiKeyId: params.apiKeyId,
        createdAt: createdAtFor(params.project.name, eventName),
      });
    }
  }

  return events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
    totalEvents: number;
    counts: Record<EventName, number>;
    funnel: ReturnType<typeof summarizeFunnel>;
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

    const events = buildEvents({
      userId: user.id,
      projectId: project.id,
      apiKeyId: apiKey.id,
      project: projectSeed,
    });

    await prisma.event.createMany({
      data: events,
    });

    apiKeySecrets.push({
      projectName: project.name,
      rawApiKey,
      maskedKey,
    });
    projectSummaries.push({
      projectName: project.name,
      apiKeyName: apiKey.name,
      totalEvents: events.length,
      counts: projectSeed.eventCounts,
      funnel: summarizeFunnel(events),
    });
  }

  const totalEvents = projectSummaries.reduce(
    (sum, project) => sum + project.totalEvents,
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
  }

  console.log(`\nProjects created: ${projectSummaries.length}`);
  console.log(`API keys created: ${apiKeySecrets.length}`);
  console.log(`Total events inserted: ${totalEvents}`);
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
