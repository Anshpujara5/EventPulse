import { Prisma } from "@prisma/client";
import type { AnalyticsScope } from "./analyticsScope";
import {
  ALL_COMMERCE_ALIASES,
  COMMERCE_FRICTION_ALIASES,
  COMMERCE_STEPS,
  type CommerceStepId,
} from "./shared/aliases";
import { roundPct, toCount } from "./shared/numbers";
import { prisma } from "../config/prisma";

interface CommerceCountRow {
  name: string;
  count: bigint;
}

export interface CommerceFunnelStep {
  id: CommerceStepId;
  label: string;
  count: number;
  conversionFromFirstPercent: number | null;
  conversionFromPreviousPercent: number | null;
  dropOffFromPreviousPercent: number | null;
}

export interface CommerceFriction {
  paymentFailed: number;
  outOfStock: number;
  itemUnavailable: number;
  deliveryFeeShown: number;
  etaShown: number;
  couponApplied: number;
}

export interface CommerceFunnelInsight {
  type:
    | "healthy"
    | "view_to_cart_drop"
    | "cart_to_checkout_drop"
    | "checkout_to_purchase_drop"
    | "missing_top_of_funnel"
    | "no_commerce_events";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
}

export interface CommerceFunnel {
  label: string;
  totalCommerceEvents: number;
  // Funnel-step events + friction events — see comment at its computation.
  commerceSignalEvents: number;
  steps: CommerceFunnelStep[];
  friction: CommerceFriction;
  insight: CommerceFunnelInsight;
}

const VIEW_TO_CART_DROP_THRESHOLD_PCT = 70;
const CART_TO_CHECKOUT_DROP_THRESHOLD_PCT = 60;
const CHECKOUT_TO_PURCHASE_DROP_THRESHOLD_PCT = 50;

export async function fetchCommerceCounts(
  scope: AnalyticsScope,
): Promise<Map<string, number>> {
  // Commerce funnel + friction counts, grouped by lowered event name so
  // alias matching is case-insensitive. Same project/range scope as the
  // rest of analytics; alias list is bound as parameters via Prisma.join.
  const rows = await prisma.$queryRaw<CommerceCountRow[]>`
    SELECT LOWER(name) AS name, COUNT(*) AS count
    FROM "Event"
    WHERE ${scope.sql.currentEvent}
    AND LOWER(name) IN (${Prisma.join(ALL_COMMERCE_ALIASES)})
    GROUP BY LOWER(name)
  `;

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.name, toCount(row.count));
  }

  return counts;
}

export function buildCommerceFunnel(
  countsByName: Map<string, number>,
): CommerceFunnel {
  const countFor = (aliases: readonly string[]): number =>
    aliases.reduce((sum, alias) => sum + (countsByName.get(alias) ?? 0), 0);

  const rawCounts = COMMERCE_STEPS.map((step) => countFor(step.aliases));
  const firstCount = rawCounts[0] ?? 0;
  const totalCommerceEvents = rawCounts.reduce((sum, count) => sum + count, 0);

  const steps: CommerceFunnelStep[] = COMMERCE_STEPS.map((step, index) => {
    const count = rawCounts[index] ?? 0;

    // Without any product views there is no funnel baseline — every
    // percentage is null rather than a made-up number.
    if (firstCount === 0) {
      return {
        id: step.id,
        label: step.label,
        count,
        conversionFromFirstPercent: null,
        conversionFromPreviousPercent: null,
        dropOffFromPreviousPercent: null,
      };
    }

    if (index === 0) {
      return {
        id: step.id,
        label: step.label,
        count,
        conversionFromFirstPercent: 100,
        conversionFromPreviousPercent: null,
        dropOffFromPreviousPercent: null,
      };
    }

    const previousCount = rawCounts[index - 1] ?? 0;
    const conversionFromPreviousPercent =
      previousCount > 0 ? roundPct((count / previousCount) * 100) : null;

    return {
      id: step.id,
      label: step.label,
      count,
      conversionFromFirstPercent: roundPct((count / firstCount) * 100),
      conversionFromPreviousPercent,
      dropOffFromPreviousPercent:
        conversionFromPreviousPercent !== null
          ? roundPct(100 - conversionFromPreviousPercent)
          : null,
    };
  });

  const friction: CommerceFriction = {
    paymentFailed: countFor(COMMERCE_FRICTION_ALIASES.paymentFailed),
    outOfStock: countFor(COMMERCE_FRICTION_ALIASES.outOfStock),
    itemUnavailable: countFor(COMMERCE_FRICTION_ALIASES.itemUnavailable),
    deliveryFeeShown: countFor(COMMERCE_FRICTION_ALIASES.deliveryFeeShown),
    etaShown: countFor(COMMERCE_FRICTION_ALIASES.etaShown),
    couponApplied: countFor(COMMERCE_FRICTION_ALIASES.couponApplied),
  };

  // Funnel-step events plus friction events — used to decide whether *any*
  // commerce signal exists in this scope, so a friction-only scope (e.g. only
  // payment_failed events, no funnel steps) isn't reported as "no commerce
  // events" just because it has no funnel-step events.
  const frictionTotal = Object.values(friction).reduce((sum, c) => sum + c, 0);
  const commerceSignalEvents = totalCommerceEvents + frictionTotal;

  const viewToCartDrop = steps[1]?.dropOffFromPreviousPercent ?? null;
  const cartToCheckoutDrop = steps[2]?.dropOffFromPreviousPercent ?? null;
  const checkoutToPurchaseDrop = steps[3]?.dropOffFromPreviousPercent ?? null;

  let insight: CommerceFunnelInsight;
  if (commerceSignalEvents === 0) {
    insight = {
      type: "no_commerce_events",
      severity: "info",
      title: "No commerce funnel events",
      description:
        "No commerce funnel events were received in this scope yet.",
    };
  } else if (firstCount === 0) {
    // Commerce events exist, but the top of the funnel (product_viewed) is
    // missing — so we can't compute conversion. Real counts still show below.
    insight = {
      type: "missing_top_of_funnel",
      severity: "warning",
      title: "Missing product view tracking",
      description:
        "Commerce events were received, but product_viewed events are missing. Add product_viewed tracking to measure the full shopper journey.",
    };
  } else if (
    viewToCartDrop !== null &&
    viewToCartDrop > VIEW_TO_CART_DROP_THRESHOLD_PCT
  ) {
    insight = {
      type: "view_to_cart_drop",
      severity: "warning",
      title: "Shoppers view products but rarely add to cart",
      description: `${viewToCartDrop}% of product views do not turn into add-to-cart events in this scope.`,
    };
  } else if (
    cartToCheckoutDrop !== null &&
    cartToCheckoutDrop > CART_TO_CHECKOUT_DROP_THRESHOLD_PCT
  ) {
    insight = {
      type: "cart_to_checkout_drop",
      severity: "warning",
      title: "Carts are not reaching checkout",
      description: `${cartToCheckoutDrop}% of add-to-cart events do not lead to a started checkout in this scope.`,
    };
  } else if (
    checkoutToPurchaseDrop !== null &&
    checkoutToPurchaseDrop > CHECKOUT_TO_PURCHASE_DROP_THRESHOLD_PCT
  ) {
    insight = {
      type: "checkout_to_purchase_drop",
      severity: "critical",
      title: "Checkouts are not converting into purchases",
      description: `${checkoutToPurchaseDrop}% of started checkouts do not end in a completed purchase in this scope.`,
    };
  } else {
    insight = {
      type: "healthy",
      severity: "info",
      title: "Funnel looks healthy",
      description:
        "No unusual drop-off detected between funnel steps in this scope.",
    };
  }

  return {
    label: "Product Viewed → Purchase Completed",
    totalCommerceEvents,
    commerceSignalEvents,
    steps,
    friction,
    insight,
  };
}
