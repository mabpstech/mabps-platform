import { platformErrorResponse } from "@/lib/platform/http";
import type { CatalogFilters } from "@/lib/marketplace/types";

export function marketplaceErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "marketplace",
    fallback: "Unexpected Marketplace error.",
  });
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
