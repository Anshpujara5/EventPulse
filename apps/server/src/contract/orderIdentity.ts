import { ACCEPTED_EVENT_ALIASES } from "./taxonomy";

/**
 * Order identity rules from Tracking Contract sections 3 and 7.
 * These constants describe future metric semantics; they perform no counting.
 */
export const ORDER_ID_PROPERTY_NAME = "order_id";
export const ORDER_BUSINESS_FACT_DEDUPLICATION_KEY = ORDER_ID_PROPERTY_NAME;
export const ORDER_IDENTITY_SCOPE = "project";

/**
 * Events allowed to mint a confirmed order. Payment events may add supporting
 * evidence to an existing order, but they never create order identity.
 */
export const ORDER_FACT_EVENT_NAMES = [
  "purchase_completed",
  ...ACCEPTED_EVENT_ALIASES.purchase_completed,
] as const;

/**
 * Transport idempotency prevents duplicate event delivery per API key.
 * It is deliberately distinct from project-scoped order identity.
 */
export const TRANSPORT_IDEMPOTENCY_SCOPE = "api-key";
export const TRANSPORT_IDEMPOTENCY_IS_ORDER_IDENTITY = false;

export const ORDER_COUNT_BASIS = {
  exact: "distinct-order-id",
  sessionEstimate: "purchasing-session-estimate",
} as const;

export type OrderCountBasis =
  (typeof ORDER_COUNT_BASIS)[keyof typeof ORDER_COUNT_BASIS];

/** Session fallback must never be presented as an exact order count. */
export const SESSION_ORDER_FALLBACK_IS_ESTIMATE = true;
export const SESSION_ORDER_FALLBACK_LABEL =
  "Estimated from purchasing sessions";
