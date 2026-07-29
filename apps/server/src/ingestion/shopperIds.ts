import { hasControlChars } from "./envelope";

export const MAX_SHOPPER_ID_LENGTH = 120;

export function validateShopperId(
  value: unknown,
  field: "customerId" | "sessionId",
): { value: string; error: null } | { value: null; error: string } {
  if (typeof value !== "string") {
    return { value: null, error: `${field} is required and must be a string` };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { value: null, error: `${field} must not be empty` };
  }

  if (trimmed.length > MAX_SHOPPER_ID_LENGTH) {
    return {
      value: null,
      error: `${field} must be between 1 and ${MAX_SHOPPER_ID_LENGTH} characters`,
    };
  }

  if (hasControlChars(trimmed)) {
    return {
      value: null,
      error: `${field} must not contain control characters`,
    };
  }

  return { value: trimmed, error: null };
}
