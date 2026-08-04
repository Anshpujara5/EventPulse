import { Prisma } from "@prisma/client";
import type { AnalyticsScope } from "./analyticsScope";
import {
  ACCEPTED_EVENT_ALIASES,
  ADD_TO_CART_ALIASES,
  CHECKOUT_ALIASES,
  PRODUCT_VIEW_ALIASES,
} from "../contract/taxonomy";
import { prisma } from "../config/prisma";

export type TrackingReadinessId =
  | "funnel"
  | "sessions"
  | "products"
  | "orders"
  | "gmvAov"
  | "productRevenue"
  | "payments"
  | "refunds";

export type TrackingReadinessStatus = "ready" | "locked";

// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export interface TrackingReadinessItem {
  id: TrackingReadinessId;
  rung: number;
  status: TrackingReadinessStatus;
  label: string;
  unlockGuidance: string | null;
}

interface TrackingReadinessRow {
  funnel: boolean;
  sessions: boolean;
  products: boolean;
  orders: boolean;
  gmvAov: boolean;
  productRevenue: boolean;
  payments: boolean;
  refunds: boolean;
}

interface ReadinessDefinition {
  id: TrackingReadinessId;
  rung: number;
  label: string;
  unlockGuidance: string;
}

const FUNNEL_EVENT_NAMES = [
  ...PRODUCT_VIEW_ALIASES,
  ...ADD_TO_CART_ALIASES,
  ...CHECKOUT_ALIASES,
  "purchase_completed",
  ...ACCEPTED_EVENT_ALIASES.purchase_completed,
] as const;

const PRODUCT_EVENT_NAMES = [
  ...PRODUCT_VIEW_ALIASES,
  ...ADD_TO_CART_ALIASES,
  "remove_from_cart",
  "wishlist_added",
  "wishlist_removed",
  "item_out_of_stock",
  "item_unavailable",
] as const;

const PURCHASE_EVENT_NAMES = [
  "purchase_completed",
  ...ACCEPTED_EVENT_ALIASES.purchase_completed,
] as const;

const READINESS_DEFINITIONS: readonly ReadinessDefinition[] = [
  {
    id: "funnel",
    rung: 1,
    label: "Funnel tracking",
    unlockGuidance:
      "Send product_viewed, add_to_cart, checkout_started, and purchase_completed to light up the funnel.",
  },
  {
    id: "sessions",
    rung: 2,
    label: "Session analytics",
    unlockGuidance:
      "Send customerId and sessionId with events to unlock session-based analytics.",
  },
  {
    id: "products",
    rung: 3,
    label: "Product analytics",
    unlockGuidance:
      "Add product_id to product events to unlock Product Performance.",
  },
  {
    id: "orders",
    rung: 4,
    label: "Order tracking",
    unlockGuidance:
      "Add order_id to purchase_completed to unlock exact order counts.",
  },
  {
    id: "gmvAov",
    rung: 5,
    label: "GMV & AOV",
    unlockGuidance: "Add amount + currency to unlock GMV and AOV.",
  },
  {
    id: "productRevenue",
    rung: 6,
    label: "Product purchase attribution",
    unlockGuidance:
      "Add items[] to unlock confirmed product purchases and units sold.",
  },
  {
    id: "payments",
    rung: 7,
    label: "Payment analytics",
    unlockGuidance:
      "Send payment_attempted with payment_attempt_id to unlock failure rates.",
  },
  {
    id: "refunds",
    rung: 8,
    label: "Refund history",
    unlockGuidance: "Send refund_issued to accumulate refund history.",
  },
] as const;

/**
 * Detects contract capability only. It does not calculate business metrics or
 * alter the existing health score.
 */
export async function fetchTrackingReadiness(
  scope: AnalyticsScope,
): Promise<TrackingReadinessItem[]> {
  const rows = await prisma.$queryRaw<TrackingReadinessRow[]>`
    SELECT
      COUNT(*) FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...FUNNEL_EVENT_NAMES])})
      ) > 0 AS funnel,
      COUNT(*) FILTER (
        WHERE NULLIF(BTRIM("customerId"), '') IS NOT NULL
          AND NULLIF(BTRIM("sessionId"), '') IS NOT NULL
      ) > 0 AS sessions,
      COUNT(*) FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...PRODUCT_EVENT_NAMES])})
          AND NULLIF(BTRIM(properties->>'product_id'), '') IS NOT NULL
      ) > 0 AS products,
      COUNT(*) FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...PURCHASE_EVENT_NAMES])})
          AND NULLIF(BTRIM(properties->>'order_id'), '') IS NOT NULL
      ) > 0 AS orders,
      COUNT(*) FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...PURCHASE_EVENT_NAMES])})
          AND (properties->>'amount') ~ '^[0-9]+([.][0-9]{1,2})?$'
          AND (properties->>'currency') ~ '^[A-Z]{3}$'
      ) > 0 AS "gmvAov",
      COUNT(*) FILTER (
        WHERE LOWER(name) IN (${Prisma.join([...PURCHASE_EVENT_NAMES])})
          AND CASE
            WHEN jsonb_typeof(properties->'items') = 'array'
              THEN jsonb_array_length(properties->'items') > 0
            ELSE FALSE
          END
      ) > 0 AS "productRevenue",
      COUNT(*) FILTER (
        WHERE LOWER(name) = 'payment_attempted'
          AND NULLIF(BTRIM(properties->>'payment_attempt_id'), '') IS NOT NULL
      ) > 0 AS payments,
      COUNT(*) FILTER (
        WHERE LOWER(name) = 'refund_issued'
          AND NULLIF(BTRIM(properties->>'order_id'), '') IS NOT NULL
          AND (properties->>'currency') ~ '^[A-Z]{3}$'
          AND CASE
            WHEN (properties->>'amount') ~ '^[0-9]+([.][0-9]{1,2})?$'
              THEN (properties->>'amount')::numeric > 0
            ELSE FALSE
          END
      ) > 0 AS refunds
    FROM "Event"
    WHERE ${scope.sql.currentEvent}
  `;

  const row = rows[0];

  return READINESS_DEFINITIONS.map((definition) => {
    const ready = row?.[definition.id] === true;

    return {
      id: definition.id,
      rung: definition.rung,
      status: ready ? "ready" : "locked",
      label: definition.label,
      unlockGuidance: ready ? null : definition.unlockGuidance,
    };
  });
}
