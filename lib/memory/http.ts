import { platformErrorResponse } from "@/lib/platform/http";
import { MEMORY_KINDS, MEMORY_SCOPE_TYPES } from "@/lib/memory/types";

export function memoryErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "memory",
    fallback: "Unexpected Memory Engine error.",
  });
}

export function parseMemoryListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;
  const includeExpired = searchParams.get("includeExpired");
  const includeMerged = searchParams.get("includeMerged");

  return {
    q: searchParams.get("q")?.trim() || undefined,
    kind: searchParams.get("kind")?.trim() || undefined,
    scopeType: searchParams.get("scopeType")?.trim() || undefined,
    scopeId: searchParams.get("scopeId")?.trim() || undefined,
    key: searchParams.get("key")?.trim() || undefined,
    includeExpired:
      includeExpired === "1" || includeExpired === "true" ? true : undefined,
    includeMerged:
      includeMerged === "1" || includeMerged === "true" ? true : undefined,
    limit:
      typeof limit === "number" && Number.isFinite(limit)
        ? Math.min(Math.max(1, Math.floor(limit)), 500)
        : undefined,
    offset:
      typeof offset === "number" && Number.isFinite(offset)
        ? Math.max(0, Math.floor(offset))
        : undefined,
  };
}

export function parseMemoryKind(value: unknown) {
  if (typeof value !== "string") return null;
  return MEMORY_KINDS.includes(value as (typeof MEMORY_KINDS)[number])
    ? (value as (typeof MEMORY_KINDS)[number])
    : null;
}

export function parseMemoryScopeType(value: unknown) {
  if (typeof value !== "string") return null;
  return MEMORY_SCOPE_TYPES.includes(
    value as (typeof MEMORY_SCOPE_TYPES)[number],
  )
    ? (value as (typeof MEMORY_SCOPE_TYPES)[number])
    : null;
}
