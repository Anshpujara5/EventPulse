// In-memory, per-process rate limiter for event ingestion.
//
// NOTE: this only works correctly for a single server instance. If EventPulse
// ever runs multiple API instances (horizontal scaling), this must move to a
// shared store (e.g. Redis) — otherwise each instance enforces its own
// independent 100/min limit instead of one shared limit per API key.

const WINDOW_MS = 60_000;
const MAX_EVENTS_PER_WINDOW = 100;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export function checkRateLimit(apiKeyId: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(apiKeyId);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(apiKeyId, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_EVENTS_PER_WINDOW - 1, limit: MAX_EVENTS_PER_WINDOW };
  }

  if (bucket.count >= MAX_EVENTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, limit: MAX_EVENTS_PER_WINDOW };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: MAX_EVENTS_PER_WINDOW - bucket.count,
    limit: MAX_EVENTS_PER_WINDOW,
  };
}
