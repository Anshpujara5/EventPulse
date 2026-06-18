export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidEmail(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isStrongPassword(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return (
    value.length >= 8 &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value)
  );
}

export function isValidDomain(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const domain = value.trim();

  if (/\s/.test(domain) || !domain.includes(".")) {
    return false;
  }

  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(
    domain,
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeString(value: string): string {
  return value.trim();
}
