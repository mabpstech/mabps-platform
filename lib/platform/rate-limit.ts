import { NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limiter for public surfaces.
 * Suitable for single-node pilot; swap the store for Redis later.
 */

export type RateLimitBucket =
  | "chatbot"
  | "chatbotWrite"
  | "form"
  | "webhook"
  | "tracking"
  | "automation";

export const PUBLIC_RATE_LIMITS: Record<
  RateLimitBucket,
  { limit: number; windowMs: number }
> = {
  /** Widget config / embed / transcript reads */
  chatbot: { limit: 60, windowMs: 60_000 },
  /** Session create, messages POST, lead, handoff */
  chatbotWrite: { limit: 30, windowMs: 60_000 },
  /** Public website form submit */
  form: { limit: 20, windowMs: 60_000 },
  /** Provider / automation webhooks (may burst) */
  webhook: { limit: 120, windowMs: 60_000 },
  /** Email open/click tracking */
  tracking: { limit: 300, windowMs: 60_000 },
  /** Automation API triggers */
  automation: { limit: 60, windowMs: 60_000 },
};

type BucketEntry = { timestamps: number[] };

const store = new Map<string, BucketEntry>();

let lastPruneAt = 0;
const PRUNE_INTERVAL_MS = 60_000;

export type RateLimitOk = {
  ok: true;
  remaining: number;
  resetAt: number;
};

export type RateLimitDenied = {
  ok: false;
  remaining: 0;
  resetAt: number;
  retryAfterSec: number;
};

export type RateLimitResult = RateLimitOk | RateLimitDenied;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function pruneStore(now: number) {
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  for (const [key, entry] of store) {
    if (entry.timestamps.length === 0) {
      store.delete(key);
      continue;
    }
    const newest = entry.timestamps[entry.timestamps.length - 1]!;
    // Drop keys idle longer than the longest configured window.
    if (now - newest > 120_000) {
      store.delete(key);
    }
  }
}

/**
 * Record one hit against `key`. Returns whether the request is allowed.
 */
export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = input.now ?? Date.now();
  pruneStore(now);

  const entry = store.get(input.key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < input.windowMs);

  if (entry.timestamps.length >= input.limit) {
    const oldest = entry.timestamps[0]!;
    const resetAt = oldest + input.windowMs;
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - now) / 1000));
    store.set(input.key, entry);
    return { ok: false, remaining: 0, resetAt, retryAfterSec };
  }

  entry.timestamps.push(now);
  store.set(input.key, entry);
  const resetAt =
    (entry.timestamps[0] ?? now) + input.windowMs;
  return {
    ok: true,
    remaining: input.limit - entry.timestamps.length,
    resetAt,
  };
}

export function rateLimitResponse(denied: RateLimitDenied): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(denied.retryAfterSec),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(denied.resetAt / 1000)),
      },
    },
  );
}

/**
 * Enforce a named public bucket keyed by client IP.
 * Returns a 429 NextResponse when limited; otherwise null.
 */
export function enforcePublicRateLimit(
  request: Request,
  bucket: RateLimitBucket,
): NextResponse | null {
  const config = PUBLIC_RATE_LIMITS[bucket];
  const ip = getClientIp(request);
  const result = checkRateLimit({
    key: `${bucket}:${ip}`,
    limit: config.limit,
    windowMs: config.windowMs,
  });
  if (!result.ok) return rateLimitResponse(result);
  return null;
}

/** Test / ops helper — clears the in-memory store. */
export function resetRateLimitStore() {
  store.clear();
  lastPruneAt = 0;
}
