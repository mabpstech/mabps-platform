import { NextResponse } from "next/server";
import { MarketplaceAuthError } from "@/lib/marketplace/access";
import type { CatalogFilters } from "@/lib/marketplace/types";

export function marketplaceErrorResponse(error: unknown) {
  if (error instanceof MarketplaceAuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected Marketplace error.";

  let status = 400;
  if (
    message.includes("Authentication required") ||
    message.includes("Unauthorized") ||
    message.includes("Invalid API key")
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
    message.includes("Upgrade to continue") ||
    message.includes("requires the")
  ) {
    status = 402;
  } else if (
    message.includes("permission") ||
    message.includes("Permission") ||
    message.includes("denied")
  ) {
    status = 403;
  } else if (message.includes("not implemented")) {
    status = 501;
  }

  console.error("[marketplace]", error);
  return NextResponse.json({ error: message }, { status });
}

export function parseMarketplaceCatalogFilters(
  searchParams: URLSearchParams,
): CatalogFilters {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    kind: searchParams.get("kind")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    tag: searchParams.get("tag")?.trim() || undefined,
    pricingModel: searchParams.get("pricingModel")?.trim() || undefined,
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
