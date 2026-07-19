/**
 * Process-local TTL cache for hot entitlement / plan / settings reads (P3-4).
 *
 * Default driver is in-memory (safe for single-node). Optional Redis (Upstash REST)
 * shares invalidations across instances; each process still keeps a short L1 TTL.
 *
 * See docs comments in `.env.example` (`CACHE_*`, `UPSTASH_REDIS_*`).
 */

export type CacheDriver = "memory" | "redis";

export type CacheStats = {
  driver: CacheDriver;
  size: number;
  hits: number;
  misses: number;
};

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 30_000;
const MAX_MEMORY_KEYS = 5_000;

const memory = new Map<string, CacheEntry>();
let hits = 0;
let misses = 0;

function now(): number {
  return Date.now();
}

function resolveTtlMs(ttlMs?: number): number {
  if (typeof ttlMs === "number" && Number.isFinite(ttlMs) && ttlMs > 0) {
    return Math.floor(ttlMs);
  }
  const fromEnv = Number(process.env.CACHE_TTL_MS || "");
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return Math.floor(fromEnv);
  }
  return DEFAULT_TTL_MS;
}

export function resolveCacheDriver(): CacheDriver {
  const raw = (process.env.CACHE_DRIVER || "memory").trim().toLowerCase();
  if (raw === "redis" || raw === "upstash") return "redis";
  return "memory";
}

function pruneExpired(at = now()): void {
  for (const [key, entry] of memory) {
    if (entry.expiresAt <= at) memory.delete(key);
  }
  if (memory.size <= MAX_MEMORY_KEYS) return;
  // Drop oldest-expiring keys when the process cache grows too large.
  const ranked = [...memory.entries()].sort(
    (a, b) => a[1].expiresAt - b[1].expiresAt,
  );
  const overflow = memory.size - MAX_MEMORY_KEYS;
  for (let i = 0; i < overflow; i++) {
    const key = ranked[i]?.[0];
    if (key) memory.delete(key);
  }
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = memory.get(key);
  if (!entry) {
    misses += 1;
    return undefined;
  }
  if (entry.expiresAt <= now()) {
    memory.delete(key);
    misses += 1;
    return undefined;
  }
  hits += 1;
  return entry.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs?: number): void {
  pruneExpired();
  memory.set(key, {
    value,
    expiresAt: now() + resolveTtlMs(ttlMs),
  });
}

export function cacheDelete(...keys: string[]): void {
  for (const key of keys) memory.delete(key);
  if (resolveCacheDriver() === "redis") {
    void redisDel(keys).catch(() => {
      /* best-effort cross-instance invalidation */
    });
  }
}

export function cacheDeleteByPrefix(prefix: string): void {
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

export function cacheClear(): void {
  memory.clear();
  hits = 0;
  misses = 0;
}

export function cacheGetOrSet<T>(
  key: string,
  loader: () => T,
  ttlMs?: number,
): T {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = loader();
  cacheSet(key, value, ttlMs);
  return value;
}

export function getCacheStats(): CacheStats {
  pruneExpired();
  return {
    driver: resolveCacheDriver(),
    size: memory.size,
    hits,
    misses,
  };
}

/** Stable key helpers for entitlements / settings. */
export const CacheKeys = {
  planId: (workspaceId: string) => `entitlements:plan:${workspaceId}`,
  subscription: (workspaceId: string) => `entitlements:sub:${workspaceId}`,
  aiSettings: (workspaceId: string) => `settings:ai:${workspaceId}`,
} as const;

export function invalidateWorkspaceEntitlements(workspaceId: string): void {
  cacheDelete(
    CacheKeys.planId(workspaceId),
    CacheKeys.subscription(workspaceId),
  );
}

export function invalidateWorkspaceSettings(workspaceId: string): void {
  cacheDelete(CacheKeys.aiSettings(workspaceId));
}

async function redisDel(keys: string[]): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token || keys.length === 0) return;

  const pipeline = keys.map((key) => ["DEL", key]);
  await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pipeline),
  });
}
