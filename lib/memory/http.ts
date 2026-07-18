import { NextResponse } from "next/server";
import { MemoryAuthError } from "@/lib/memory/access";
import { MEMORY_KINDS, MEMORY_SCOPE_TYPES } from "@/lib/memory/types";

export function memoryErrorResponse(error: unknown) {
  if (error instanceof MemoryAuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected Memory Engine error.";

  let status = 400;
  if (
    message.includes("Authentication required") ||
    message.includes("Unauthorized")
  ) {
    status = 401;
  } else if (
    message.includes("not found") ||
    message.includes("Not found")
  ) {
    status = 404;
  } else if (
    message.includes("Plan limit") ||
    message.includes("plan allows") ||
    message.includes("Upgrade to continue")
  ) {
    status = 402;
  } else if (message.includes("not implemented")) {
    status = 501;
  }

  console.error("[memory]", error);
  return NextResponse.json({ error: message }, { status });
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
