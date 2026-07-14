import { Prisma } from "@prisma/client";
import type { AnalyticsScope } from "./analyticsScope";
import {
  SESSION_FUNNEL_STEPS,
  type CommerceStepId,
} from "./shared/aliases";
import { roundPct, toCount } from "./shared/numbers";
import { prisma } from "../config/prisma";

interface SessionFunnelRow {
  totalSessions: bigint;
  productViewed: bigint;
  addToCart: bigint;
  checkoutStarted: bigint;
  purchaseCompleted: bigint;
}

export interface SessionFunnelStep {
  id: CommerceStepId;
  label: string;
  sessions: number;
  conversionFromFirstPercent: number | null;
  conversionFromPreviousPercent: number | null;
  dropOffFromPreviousPercent: number | null;
  abandonedFromPrevious: number | null;
}

export interface SessionFunnelAbandonment {
  viewedNotCarted: number;
  cartedNotCheckout: number;
  checkoutNotPurchased: number;
}

export interface SessionFunnelInsight {
  type:
    | "healthy"
    | "view_to_cart_drop"
    | "cart_to_checkout_drop"
    | "checkout_to_purchase_drop"
    | "no_session_data";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
}

export interface SessionFunnel {
  label: string;
  totalSessions: number;
  steps: SessionFunnelStep[];
  abandonment: SessionFunnelAbandonment;
  insight: SessionFunnelInsight;
}

const VIEW_TO_CART_DROP_THRESHOLD_PCT = 70;
const CART_TO_CHECKOUT_DROP_THRESHOLD_PCT = 60;
const CHECKOUT_TO_PURCHASE_DROP_THRESHOLD_PCT = 50;

export async function fetchSessionFunnel(
  scope: AnalyticsScope,
): Promise<SessionFunnelRow | undefined> {
  // Session-based funnel: distinct sessions that reached each stage. Only
  // rows with a non-null sessionId count. Same project/range scope as the
  // rest of analytics; alias lists bound as parameters via Prisma.join.
  const rows = await prisma.$queryRaw<SessionFunnelRow[]>`
    SELECT
      COUNT(DISTINCT "sessionId") AS "totalSessions",
      COUNT(DISTINCT "sessionId") FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...SESSION_FUNNEL_STEPS[0].aliases])})
      ) AS "productViewed",
      COUNT(DISTINCT "sessionId") FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...SESSION_FUNNEL_STEPS[1].aliases])})
      ) AS "addToCart",
      COUNT(DISTINCT "sessionId") FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...SESSION_FUNNEL_STEPS[2].aliases])})
      ) AS "checkoutStarted",
      COUNT(DISTINCT "sessionId") FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...SESSION_FUNNEL_STEPS[3].aliases])})
      ) AS "purchaseCompleted"
    FROM "Event"
    WHERE ${scope.sql.currentEvent}
      AND "sessionId" IS NOT NULL
  `;

  return rows[0];
}

export function buildSessionFunnel(
  row: SessionFunnelRow | undefined,
): SessionFunnel {
  const totalSessions = toCount(row?.totalSessions);
  const stepSessions = [
    toCount(row?.productViewed),
    toCount(row?.addToCart),
    toCount(row?.checkoutStarted),
    toCount(row?.purchaseCompleted),
  ];
  const firstCount = stepSessions[0] ?? 0;

  const steps: SessionFunnelStep[] = SESSION_FUNNEL_STEPS.map((step, index) => {
    const sessions = stepSessions[index] ?? 0;

    // No sessions reached the top of the funnel — no baseline, so every
    // percentage is null rather than fabricated.
    if (firstCount === 0) {
      return {
        id: step.id,
        label: step.label,
        sessions,
        conversionFromFirstPercent: null,
        conversionFromPreviousPercent: null,
        dropOffFromPreviousPercent: null,
        abandonedFromPrevious: null,
      };
    }

    if (index === 0) {
      return {
        id: step.id,
        label: step.label,
        sessions,
        conversionFromFirstPercent: 100,
        conversionFromPreviousPercent: null,
        dropOffFromPreviousPercent: null,
        abandonedFromPrevious: null,
      };
    }

    const previousSessions = stepSessions[index - 1] ?? 0;
    const conversionFromPreviousPercent =
      previousSessions > 0 ? roundPct((sessions / previousSessions) * 100) : null;

    return {
      id: step.id,
      label: step.label,
      sessions,
      conversionFromFirstPercent: roundPct((sessions / firstCount) * 100),
      conversionFromPreviousPercent,
      dropOffFromPreviousPercent:
        conversionFromPreviousPercent !== null
          ? roundPct(100 - conversionFromPreviousPercent)
          : null,
      // Steps aren't strictly nested (a session could purchase without a
      // recorded view), so clamp at 0 — a negative "abandoned" count is
      // never meaningful to show.
      abandonedFromPrevious: Math.max(0, previousSessions - sessions),
    };
  });

  const abandonment: SessionFunnelAbandonment = {
    viewedNotCarted: Math.max(0, (stepSessions[0] ?? 0) - (stepSessions[1] ?? 0)),
    cartedNotCheckout: Math.max(0, (stepSessions[1] ?? 0) - (stepSessions[2] ?? 0)),
    checkoutNotPurchased: Math.max(
      0,
      (stepSessions[2] ?? 0) - (stepSessions[3] ?? 0),
    ),
  };

  const viewToCartDrop = steps[1]?.dropOffFromPreviousPercent ?? null;
  const cartToCheckoutDrop = steps[2]?.dropOffFromPreviousPercent ?? null;
  const checkoutToPurchaseDrop = steps[3]?.dropOffFromPreviousPercent ?? null;

  let insight: SessionFunnelInsight;
  if (totalSessions === 0) {
    insight = {
      type: "no_session_data",
      severity: "info",
      title: "No session data yet",
      description:
        "Send events with customerId and sessionId to unlock session-based funnel analytics.",
    };
  } else if (
    viewToCartDrop !== null &&
    viewToCartDrop > VIEW_TO_CART_DROP_THRESHOLD_PCT
  ) {
    insight = {
      type: "view_to_cart_drop",
      severity: "warning",
      title: "Sessions view products but rarely add to cart",
      description: `${viewToCartDrop}% of sessions that viewed a product did not add anything to cart.`,
    };
  } else if (
    cartToCheckoutDrop !== null &&
    cartToCheckoutDrop > CART_TO_CHECKOUT_DROP_THRESHOLD_PCT
  ) {
    insight = {
      type: "cart_to_checkout_drop",
      severity: "warning",
      title: "Carts are not reaching checkout",
      description: `${cartToCheckoutDrop}% of sessions with a cart did not start checkout.`,
    };
  } else if (
    checkoutToPurchaseDrop !== null &&
    checkoutToPurchaseDrop > CHECKOUT_TO_PURCHASE_DROP_THRESHOLD_PCT
  ) {
    insight = {
      type: "checkout_to_purchase_drop",
      severity: "critical",
      title: "Checkouts are not converting into purchases",
      description: `${checkoutToPurchaseDrop}% of sessions that started checkout did not complete a purchase.`,
    };
  } else {
    insight = {
      type: "healthy",
      severity: "info",
      title: "Session funnel looks healthy",
      description:
        "No unusual drop-off detected between session funnel steps in this scope.",
    };
  }

  return {
    label: "Product Viewed → Purchase Completed",
    totalSessions,
    steps,
    abandonment,
    insight,
  };
}
