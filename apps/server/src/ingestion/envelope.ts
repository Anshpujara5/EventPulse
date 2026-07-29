export const MAX_EVENT_NAME_LENGTH = 120;
export const MAX_PROPERTIES_BYTES = 16 * 1024;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 200;

type ValidationResult<T> =
  | { value: T; error: null }
  | { value: null; error: string };

export function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export function validateEventName(value: unknown): ValidationResult<string> {
  if (typeof value !== "string") {
    return {
      value: null,
      error: "Event name is required and must be a string",
    };
  }

  const eventName = value.trim();

  if (eventName.length === 0) {
    return { value: null, error: "Event name must not be empty" };
  }

  if (eventName.length > MAX_EVENT_NAME_LENGTH) {
    return {
      value: null,
      error: `Event name must be between 1 and ${MAX_EVENT_NAME_LENGTH} characters`,
    };
  }

  if (hasControlChars(eventName)) {
    return {
      value: null,
      error: "Event name must not contain control characters",
    };
  }

  return { value: eventName, error: null };
}

export function validateProperties(
  value: unknown,
): ValidationResult<Record<string, unknown>> {
  if (
    value !== undefined &&
    (typeof value !== "object" || value === null || Array.isArray(value))
  ) {
    return {
      value: null,
      error: "properties must be a plain JSON object if provided",
    };
  }

  return {
    value:
      value !== undefined ? (value as Record<string, unknown>) : {},
    error: null,
  };
}

export function validateIdempotencyKey(
  idempotencyKey: string | undefined,
): string | null {
  if (
    idempotencyKey &&
    idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH
  ) {
    return `Idempotency-Key must not exceed ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`;
  }

  return null;
}

export function serializeProperties(
  properties: Record<string, unknown>,
): ValidationResult<string> {
  const propertiesJson = JSON.stringify(properties);

  if (propertiesJson.length > MAX_PROPERTIES_BYTES) {
    return {
      value: null,
      error: `properties payload is too large (max ${
        MAX_PROPERTIES_BYTES / 1024
      }KB)`,
    };
  }

  return { value: propertiesJson, error: null };
}
