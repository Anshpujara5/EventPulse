export type CommerceStepId =
  | "product_viewed"
  | "add_to_cart"
  | "checkout_started"
  | "purchase_completed";

interface CommerceStepDefinition {
  id: CommerceStepId;
  label: string;
  aliases: readonly string[];
}

export const PRODUCT_VIEW_ALIASES = [
  "product_viewed",
  "product_view",
  "view_product",
  "product_detail_viewed",
  "product.opened",
] as const;

export const ADD_TO_CART_ALIASES = [
  "add_to_cart",
  "added_to_cart",
  "cart_added",
  "item_added_to_cart",
] as const;

export const CHECKOUT_ALIASES = [
  "checkout_started",
  "start_checkout",
  "checkout_initiated",
  "begin_checkout",
] as const;

// Shopper summary historically binds purchase_completed first. Keep this
// order distinct from the session-funnel list for query equivalence.
export const PURCHASE_ALIASES = [
  "purchase_completed",
  "payment_completed",
  "order_completed",
  "checkout_completed",
  "checkout.completed",
] as const;

// Session and product analytics historically bind payment_completed first.
const SESSION_PURCHASE_ALIASES = [
  "payment_completed",
  "purchase_completed",
  "order_completed",
  "checkout_completed",
  "checkout.completed",
] as const;

const COMMERCE_PURCHASE_ALIASES = [
  ...SESSION_PURCHASE_ALIASES,
  "order_placed",
] as const;

// Raw commerce activity includes the legacy order_placed alias. The
// session-based funnel intentionally uses the narrower purchase list.
export const COMMERCE_STEPS: readonly CommerceStepDefinition[] = [
  {
    id: "product_viewed",
    label: "Product Viewed",
    aliases: PRODUCT_VIEW_ALIASES,
  },
  {
    id: "add_to_cart",
    label: "Added to Cart",
    aliases: ADD_TO_CART_ALIASES,
  },
  {
    id: "checkout_started",
    label: "Checkout Started",
    aliases: CHECKOUT_ALIASES,
  },
  {
    id: "purchase_completed",
    label: "Purchase Completed",
    aliases: COMMERCE_PURCHASE_ALIASES,
  },
];

export const COMMERCE_FRICTION_ALIASES = {
  paymentFailed: ["payment_failed"],
  outOfStock: ["item_out_of_stock"],
  itemUnavailable: ["item_unavailable"],
  deliveryFeeShown: ["delivery_fee_shown"],
  etaShown: ["eta_shown"],
  couponApplied: ["coupon_applied"],
} as const;

export const ALL_COMMERCE_ALIASES: string[] = [
  ...COMMERCE_STEPS.flatMap((step) => [...step.aliases]),
  ...Object.values(COMMERCE_FRICTION_ALIASES).flat(),
];

export const SESSION_FUNNEL_STEPS: readonly CommerceStepDefinition[] = [
  {
    id: "product_viewed",
    label: "Product Viewed",
    aliases: PRODUCT_VIEW_ALIASES,
  },
  {
    id: "add_to_cart",
    label: "Added to Cart",
    aliases: ADD_TO_CART_ALIASES,
  },
  {
    id: "checkout_started",
    label: "Checkout Started",
    aliases: CHECKOUT_ALIASES,
  },
  {
    id: "purchase_completed",
    label: "Purchase Completed",
    aliases: SESSION_PURCHASE_ALIASES,
  },
];
