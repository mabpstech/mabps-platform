import { DEFAULT_IMPORTANCE, DEFAULT_TTL_MS } from "@/lib/memory/defaults";
import type { MemoryEntry, MemoryKind } from "@/lib/memory/types";

export function clampImportance(value: number | undefined | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function defaultImportanceForKind(kind: MemoryKind): number {
  return DEFAULT_IMPORTANCE[kind] ?? 0.5;
}

/** Recency boost decays over ~30 days. */
export function recencyBoost(updatedAt: string, now = Date.now()): number {
  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) return 0;
  const ageMs = Math.max(0, now - ts);
  const halfLifeMs = 30 * 24 * 60 * 60 * 1000;
  return Math.exp(-ageMs / halfLifeMs);
}

/** Access frequency boost (log-scaled). */
export function accessBoost(accessCount: number): number {
  if (accessCount <= 0) return 0;
  return Math.min(1, Math.log10(accessCount + 1) / 2);
}

/**
 * Standing score stored on the memory (importance + engagement).
 * Used for ranking when no query is present.
 */
export function computeStandingScore(input: {
  importance: number;
  updatedAt: string;
  accessCount: number;
  kind: MemoryKind;
}): number {
  const importance = clampImportance(input.importance);
  const recency = recencyBoost(input.updatedAt);
  const access = accessBoost(input.accessCount);
  const kindBias = DEFAULT_IMPORTANCE[input.kind] ?? 0.5;
  return (
    importance * 0.55 +
    recency * 0.25 +
    access * 0.12 +
    kindBias * 0.08
  );
}

/**
 * Retrieval score combining semantic/lexical relevance with importance.
 */
export function computeRetrievalScore(input: {
  semanticScore: number;
  lexicalScore: number;
  importance: number;
  updatedAt: string;
  accessCount: number;
}): {
  score: number;
  recencyBoost: number;
} {
  const recency = recencyBoost(input.updatedAt);
  const access = accessBoost(input.accessCount);
  const relevance = Math.max(
    input.semanticScore,
    Math.min(1, input.lexicalScore / 5),
  );
  const score =
    relevance * 0.55 +
    clampImportance(input.importance) * 0.25 +
    recency * 0.12 +
    access * 0.08;
  return { score, recencyBoost: recency };
}

export function isExpired(
  memory: Pick<MemoryEntry, "expiresAt">,
  now = Date.now(),
): boolean {
  if (!memory.expiresAt) return false;
  const ts = Date.parse(memory.expiresAt);
  return Number.isFinite(ts) && ts <= now;
}

export function defaultExpiresAt(
  kind: MemoryKind,
  explicit?: string | null,
): string | null {
  if (explicit === null) return null;
  if (typeof explicit === "string" && explicit.trim()) {
    const ts = Date.parse(explicit);
    if (!Number.isFinite(ts)) {
      throw new Error("expiresAt must be a valid ISO timestamp.");
    }
    return new Date(ts).toISOString();
  }

  const ttl = DEFAULT_TTL_MS[kind];
  if (ttl == null) return null;
  return new Date(Date.now() + ttl).toISOString();
}
