/** Machine-readable reason-code taxonomy from Tracking Contract section 11. */
export const CONTRACT_WARNING_CODES = {
  ENVELOPE_MISSING_CUSTOMER_ID: "envelope.missing_customer_id",
  ENVELOPE_INVALID_NAME: "envelope.invalid_name",
  ENVELOPE_PAYLOAD_TOO_LARGE: "envelope.payload_too_large",
  CONTRACT_MISSING_ORDER_ID: "contract.missing_order_id",
  CONTRACT_MISSING_PRODUCT_ID: "contract.missing_product_id",
  CONTRACT_MISSING_CURRENCY: "contract.missing_currency",
  CONTRACT_MISSING_PAYMENT_ATTEMPT_ID:
    "contract.missing_payment_attempt_id",
  CONTRACT_MISSING_COUPON_CODE: "contract.missing_coupon_code",
  CONTRACT_DEPRECATED_FIELD: "contract.deprecated_field",
  CONTRACT_ALIAS_EVENT_NAME: "contract.alias_event_name",
  VALUE_UNPARSEABLE_MONEY: "value.unparseable_money",
  VALUE_NEGATIVE_AMOUNT: "value.negative_amount",
  VALUE_MIXED_CURRENCY: "value.mixed_currency",
  VALUE_CLAMPED_TIMESTAMP: "value.clamped_timestamp",
  DUPLICATE_IDEMPOTENCY_KEY: "duplicate.idempotency_key",
} as const;

export type ContractWarningCode =
  (typeof CONTRACT_WARNING_CODES)[keyof typeof CONTRACT_WARNING_CODES];
