import {
  ACCEPTED_EVENT_ALIASES,
  COMMERCE_EVENT_NAMES_BY_TIER,
  DEPRECATED_PROPERTY_NAMES,
  type CanonicalCommerceEventName,
} from "./taxonomy";
import {
  CURRENCY_CODE_PATTERN,
  CURRENCY_PROPERTY_NAME,
  MONEY_PROPERTY_NAMES,
  type MoneyPropertyName,
} from "./moneyRules";
import type { ContractCheckResult, ContractWarning } from "./types";
import { CONTRACT_WARNING_CODES } from "./warningCodes";

export type ContractEventInput = {
  name: string;
  properties?: unknown;
};

type PropertyRecord = Record<string, unknown>;

type NumericCheck =
  | { kind: "valid"; value: number }
  | { kind: "negative"; value: number }
  | { kind: "invalid" };

type MoneyLineFindings = {
  invalid: number;
  negative: number;
};

const GUARDED_NUMERIC_PATTERN = /^[0-9]+([.][0-9]+)?$/;
const GUARDED_NEGATIVE_NUMERIC_PATTERN = /^-[0-9]+([.][0-9]+)?$/;

const CANONICAL_EVENT_NAMES = Object.values(COMMERCE_EVENT_NAMES_BY_TIER).flat();

const CANONICAL_EVENT_BY_LOWERCASE = new Map<string, CanonicalCommerceEventName>(
  CANONICAL_EVENT_NAMES.map((eventName) => [eventName.toLowerCase(), eventName]),
);

const ALIAS_EVENT_BY_LOWERCASE = new Map<string, CanonicalCommerceEventName>(
  Object.entries(ACCEPTED_EVENT_ALIASES).flatMap(([canonicalName, aliases]) =>
    aliases.map((alias) => [
      alias.toLowerCase(),
      canonicalName as CanonicalCommerceEventName,
    ]),
  ),
);

const PRODUCT_ID_REQUIRED_EVENTS = new Set<CanonicalCommerceEventName>([
  "product_viewed",
  "add_to_cart",
  "remove_from_cart",
  "wishlist_added",
  "wishlist_removed",
  "item_out_of_stock",
  "item_unavailable",
]);

const ORDER_ID_REQUIRED_EVENTS = new Set<CanonicalCommerceEventName>([
  "purchase_completed",
  "refund_issued",
  "order_cancelled",
  "order_delivered",
]);

const COUPON_CODE_REQUIRED_EVENTS = new Set<CanonicalCommerceEventName>([
  "coupon_applied",
  "coupon_denied",
]);

/**
 * Pure observational Commerce Tracking Contract validator.
 *
 * The validator classifies a raw event without mutating, normalizing, storing,
 * logging, or rejecting it. Unknown/custom events intentionally return no
 * warnings because custom tracking remains append-only and accepted forever.
 */
export function validateCommerceContractEvent(
  event: ContractEventInput,
): ContractCheckResult {
  const classification = classifyEventName(event.name);

  if (classification.canonicalName === null) {
    return {
      eventName: event.name,
      canonicalName: null,
      aliasUsed: false,
      warnings: [],
    };
  }

  const warnings: ContractWarning[] = [];
  const properties = isPropertyRecord(event.properties) ? event.properties : null;

  if (classification.aliasUsed) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.CONTRACT_ALIAS_EVENT_NAME,
      field: "name",
      hint:
        "name uses an accepted alias. Contract analytics still work, and new integrations should send the canonical event name.",
    });
  }

  validateRequiredFields(classification.canonicalName, properties, warnings);
  validateMoneyFields(classification.canonicalName, properties, warnings);
  validateQuantityField(properties, warnings);
  validateItems(properties, warnings);
  validateDeprecatedProperties(properties, warnings);

  return {
    eventName: event.name,
    canonicalName: classification.canonicalName,
    aliasUsed: classification.aliasUsed,
    warnings,
  };
}

function classifyEventName(eventName: string): {
  canonicalName: CanonicalCommerceEventName | null;
  aliasUsed: boolean;
} {
  const lowerEventName = eventName.toLowerCase();
  const canonicalName = CANONICAL_EVENT_BY_LOWERCASE.get(lowerEventName);

  if (canonicalName !== undefined) {
    return { canonicalName, aliasUsed: false };
  }

  const aliasedCanonicalName = ALIAS_EVENT_BY_LOWERCASE.get(lowerEventName);

  if (aliasedCanonicalName !== undefined) {
    return { canonicalName: aliasedCanonicalName, aliasUsed: true };
  }

  return { canonicalName: null, aliasUsed: false };
}

function validateRequiredFields(
  canonicalName: CanonicalCommerceEventName,
  properties: PropertyRecord | null,
  warnings: ContractWarning[],
): void {
  if (
    ORDER_ID_REQUIRED_EVENTS.has(canonicalName) &&
    !hasNonEmptyString(properties, "order_id")
  ) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.CONTRACT_MISSING_ORDER_ID,
      field: "properties.order_id",
      hint:
        "order_id is missing. Exact Orders, GMV deduplication, and order lifecycle analytics stay locked until purchase-family events include order_id.",
    });
  }

  if (
    PRODUCT_ID_REQUIRED_EVENTS.has(canonicalName) &&
    !hasNonEmptyString(properties, "product_id")
  ) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.CONTRACT_MISSING_PRODUCT_ID,
      field: "properties.product_id",
      hint:
        "product_id is missing. Product Performance uses only product events that include product_id; pass a stable catalog id with this event.",
    });
  }

  if (
    canonicalName === "payment_attempted" &&
    !hasNonEmptyString(properties, "payment_attempt_id")
  ) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.CONTRACT_MISSING_PAYMENT_ATTEMPT_ID,
      field: "properties.payment_attempt_id",
      hint:
        "payment_attempt_id is missing. Payment failure rates need one id per attempt; pass payment_attempt_id on payment_attempted.",
    });
  }

  if (
    COUPON_CODE_REQUIRED_EVENTS.has(canonicalName) &&
    !hasNonEmptyString(properties, "coupon_code")
  ) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.CONTRACT_MISSING_COUPON_CODE,
      field: "properties.coupon_code",
      hint:
        "coupon_code is missing. Coupon impact analytics need the code that was applied or denied; pass coupon_code with coupon events.",
    });
  }
}

function validateMoneyFields(
  canonicalName: CanonicalCommerceEventName,
  properties: PropertyRecord | null,
  warnings: ContractWarning[],
): void {
  if (properties === null) {
    return;
  }

  const presentMoneyFields = MONEY_PROPERTY_NAMES.filter((field) =>
    isPresent(properties, field),
  );

  if (presentMoneyFields.length > 0 && !hasValidCurrency(properties)) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.CONTRACT_MISSING_CURRENCY,
      field: "properties.currency",
      hint:
        "currency is missing or not an uppercase three-letter code. Money fields are excluded from money analytics until currency is sent with the amount.",
    });
  }

  for (const field of presentMoneyFields) {
    const result = parseMoneyValue(properties[field]);

    if (result.kind === "invalid") {
      warnings.push({
        code: CONTRACT_WARNING_CODES.VALUE_UNPARSEABLE_MONEY,
        field: `properties.${field}`,
        hint:
          `${field} is not parseable as decimal major-unit money. Money analytics use numbers or guarded numeric strings with at most two decimal places, such as 1299.00.`,
      });
      continue;
    }

    if (result.kind === "negative") {
      warnings.push({
        code: CONTRACT_WARNING_CODES.VALUE_NEGATIVE_AMOUNT,
        field: `properties.${field}`,
        hint: buildNegativeMoneyHint(canonicalName, field),
      });
      continue;
    }

    if (canonicalName === "refund_issued" && field === "amount" && result.value <= 0) {
      warnings.push({
        code: CONTRACT_WARNING_CODES.VALUE_NEGATIVE_AMOUNT,
        field: "properties.amount",
        hint:
          "amount must be positive on refund_issued. Refund analytics treat this as the refund amount; send a positive amount for the refunded value.",
      });
    }
  }
}

function validateQuantityField(
  properties: PropertyRecord | null,
  warnings: ContractWarning[],
): void {
  if (properties === null || !isPresent(properties, "quantity")) {
    return;
  }

  if (!isValidQuantity(properties.quantity)) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.VALUE_UNPARSEABLE_MONEY,
      field: "properties.quantity",
      hint:
        "quantity is not parseable. Units analytics use numbers or guarded numeric strings greater than zero; pass quantity as a positive numeric value.",
    });
  }
}

function validateItems(
  properties: PropertyRecord | null,
  warnings: ContractWarning[],
): void {
  if (properties === null || !isPresent(properties, "items")) {
    return;
  }

  if (!Array.isArray(properties.items)) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.VALUE_UNPARSEABLE_MONEY,
      field: "properties.items",
      hint:
        "items must be an array of line-item objects. Product revenue and unit analytics use items[] only when each line can be inspected safely.",
    });
    return;
  }

  let malformedLineCount = 0;
  let missingProductIdCount = 0;
  const priceFindings: MoneyLineFindings = { invalid: 0, negative: 0 };
  let invalidQuantityCount = 0;

  for (const item of properties.items) {
    if (!isPropertyRecord(item)) {
      malformedLineCount += 1;
      continue;
    }

    if (!hasNonEmptyString(item, "product_id")) {
      missingProductIdCount += 1;
    }

    if (isPresent(item, "price")) {
      incrementMoneyFindings(parseMoneyValue(item.price), priceFindings);
    }

    if (isPresent(item, "quantity") && !isValidQuantity(item.quantity)) {
      invalidQuantityCount += 1;
    }
  }

  if (malformedLineCount > 0) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.VALUE_UNPARSEABLE_MONEY,
      field: "properties.items[]",
      hint:
        `items[] contains ${formatCount(malformedLineCount, "line")} that cannot be inspected as an object. Product revenue uses only supported line-item object shapes.`,
    });
  }

  if (missingProductIdCount > 0) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.CONTRACT_MISSING_PRODUCT_ID,
      field: "properties.items[].product_id",
      hint:
        `items[].product_id is missing on ${formatCount(missingProductIdCount, "line item")}. Product revenue attribution needs product_id on each line item.`,
    });
  }

  if (priceFindings.invalid > 0) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.VALUE_UNPARSEABLE_MONEY,
      field: "properties.items[].price",
      hint:
        `items[].price is not parseable on ${formatCount(priceFindings.invalid, "line item")}. Line revenue uses decimal major-unit prices with at most two decimal places.`,
    });
  }

  if (priceFindings.negative > 0) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.VALUE_NEGATIVE_AMOUNT,
      field: "properties.items[].price",
      hint:
        `items[].price is negative on ${formatCount(priceFindings.negative, "line item")}. Line revenue excludes negative prices; send refunds as refund_issued with positive amounts instead.`,
    });
  }

  if (invalidQuantityCount > 0) {
    warnings.push({
      code: CONTRACT_WARNING_CODES.VALUE_UNPARSEABLE_MONEY,
      field: "properties.items[].quantity",
      hint:
        `items[].quantity is not parseable on ${formatCount(invalidQuantityCount, "line item")}. Units analytics need positive numeric quantities on line items.`,
    });
  }
}

function validateDeprecatedProperties(
  properties: PropertyRecord | null,
  warnings: ContractWarning[],
): void {
  if (properties === null) {
    return;
  }

  for (const field of DEPRECATED_PROPERTY_NAMES) {
    if (!isPresent(properties, field)) {
      continue;
    }

    warnings.push({
      code: CONTRACT_WARNING_CODES.CONTRACT_DEPRECATED_FIELD,
      field: `properties.${field}`,
      hint:
        `${field} is deprecated inside properties. Identity analytics use the envelope field instead; send this value as the top-level ${toEnvelopeIdentityField(field)}.`,
    });
  }
}

function parseMoneyValue(value: unknown): NumericCheck {
  const textValue = getGuardedNumericText(value);

  if (textValue === null) {
    return { kind: "invalid" };
  }

  if (textValue.startsWith("-")) {
    return { kind: "negative", value: Number(textValue) };
  }

  if (decimalPlaces(textValue) > 2) {
    return { kind: "invalid" };
  }

  return { kind: "valid", value: Number(textValue) };
}

function isValidQuantity(value: unknown): boolean {
  const textValue = getGuardedNumericText(value);

  return textValue !== null && !textValue.startsWith("-") && Number(textValue) > 0;
}

function getGuardedNumericText(value: unknown): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    const textValue = String(value);
    return isGuardedNumericText(textValue) ? textValue : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return isGuardedNumericText(trimmedValue) ? trimmedValue : null;
}

function isGuardedNumericText(value: string): boolean {
  return (
    GUARDED_NUMERIC_PATTERN.test(value) ||
    GUARDED_NEGATIVE_NUMERIC_PATTERN.test(value)
  );
}

function decimalPlaces(value: string): number {
  return value.includes(".") ? value.split(".")[1].length : 0;
}

function hasValidCurrency(properties: PropertyRecord): boolean {
  if (!isPresent(properties, CURRENCY_PROPERTY_NAME)) {
    return false;
  }

  const currency = properties[CURRENCY_PROPERTY_NAME];

  return typeof currency === "string" && CURRENCY_CODE_PATTERN.test(currency);
}

function hasNonEmptyString(
  properties: PropertyRecord | null,
  field: string,
): boolean {
  if (properties === null || !isPresent(properties, field)) {
    return false;
  }

  const value = properties[field];

  return typeof value === "string" && value.trim().length > 0;
}

function isPresent(properties: PropertyRecord, field: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(properties, field) &&
    properties[field] !== null
  );
}

function isPropertyRecord(value: unknown): value is PropertyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function incrementMoneyFindings(
  result: NumericCheck,
  findings: MoneyLineFindings,
): void {
  if (result.kind === "invalid") {
    findings.invalid += 1;
  }

  if (result.kind === "negative") {
    findings.negative += 1;
  }
}

function buildNegativeMoneyHint(
  canonicalName: CanonicalCommerceEventName,
  field: MoneyPropertyName,
): string {
  if (canonicalName === "refund_issued" && field === "amount") {
    return "amount must be positive on refund_issued. Refund analytics treat this as the refund amount; send a positive amount for the refunded value.";
  }

  return `${field} is negative. Money analytics exclude negative sale amounts; send refunds as refund_issued with a positive amount instead.`;
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function toEnvelopeIdentityField(field: string): "customerId" | "sessionId" {
  return field === "customer_id" ? "customerId" : "sessionId";
}
