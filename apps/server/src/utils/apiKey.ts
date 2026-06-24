import crypto from "crypto";

export function generateApiKey(): string {
  return `ep_live_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export function getApiKeyDisplayValues(apiKey: string): {
  keyPrefix: string;
  maskedKey: string;
} {
  const keyPrefix = apiKey.slice(0, 15);
  const suffix = apiKey.slice(-4);

  return {
    keyPrefix,
    maskedKey: `${keyPrefix}_••••••${suffix}`,
  };
}
