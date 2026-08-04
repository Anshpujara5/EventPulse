/**
 * Money contract constants from Tracking Contract section 3.
 * Amounts use decimal major units because EventPulse is analytics-grade, not
 * a ledger. Runtime conformance checks belong to Phase 1B.
 */
export const MONEY_REPRESENTATION = "decimal-major-units";
export const MAX_MONEY_DECIMAL_PLACES = 2;

/** SQL-safe text patterns for guarded JSONB money casts. */
export const NON_NEGATIVE_MONEY_SQL_PATTERN =
  "^[0-9]+([.][0-9]{1,2})?$";
export const NEGATIVE_MONEY_SQL_PATTERN =
  "^-[0-9]+([.][0-9]{1,2})?$";

export const MONEY_PROPERTY_NAMES = [
  "amount",
  "price",
  "cart_value",
  "delivery_fee",
  "discount_amount",
] as const;

export type MoneyPropertyName = (typeof MONEY_PROPERTY_NAMES)[number];

/** Currency is contract-required whenever any money property is present. */
export const CURRENCY_PROPERTY_NAME = "currency";
export const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
export const CURRENCY_REQUIRED_WITH_MONEY = true;

/** EventPulse never performs implicit foreign-exchange conversion. */
export const IMPLICIT_FOREIGN_EXCHANGE_CONVERSION_ALLOWED = false;

/**
 * Non-refund money is non-negative. refund_issued.amount is positive and its
 * event type supplies the refund meaning; callers must not negate it.
 */
export const NON_REFUND_MONEY_MUST_BE_NON_NEGATIVE = true;
export const REFUND_AMOUNT_MUST_BE_POSITIVE = true;
export const REFUND_AMOUNT_SEMANTICS = "positive-means-refund";
