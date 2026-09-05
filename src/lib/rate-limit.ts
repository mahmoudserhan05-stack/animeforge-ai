/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Good enough for a single-instance deployment (and for local/demo use).
 * The moment you run more than one server process/instance, swap the
 * `buckets` Map below for a shared store (Redis/Upstash — `@upstash/ratelimit`
 * is a drop-in) so limits are enforced across instances instead of per-process.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Periodically sweep expired buckets so this Map can't grow unbounded.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
};

/**
 * @param key unique identifier for the caller + action, e.g. `user:123:generate-script`
 * @param limit max requests allowed within the window
 * @param windowMs window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, limit, resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, limit, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { success: true, remaining: limit - existing.count, limit, resetAt: existing.resetAt };
}

/** Preset limits for the more expensive AI-backed routes. */
export const RATE_LIMITS = {
  aiGeneration: { limit: 20, windowMs: 60_000 }, // 20 AI calls / minute / user
  auth: { limit: 10, windowMs: 60_000 }, // 10 login/register attempts / minute / IP
  mutation: { limit: 60, windowMs: 60_000 }, // general writes
} as const;
