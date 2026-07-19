import { platformErrorResponse } from "@/lib/platform/http";

export function crmErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "crm",
    fallback: "Unexpected CRM error.",
  });
}

export function parseListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    ownerUserId: searchParams.get("ownerUserId")?.trim() || undefined,
    companyId: searchParams.get("companyId")?.trim() || undefined,
    tagId: searchParams.get("tagId")?.trim() || undefined,
    stageId: searchParams.get("stageId")?.trim() || undefined,
    pipelineId: searchParams.get("pipelineId")?.trim() || undefined,
    priority: searchParams.get("priority")?.trim() || undefined,
    type: searchParams.get("type")?.trim() || undefined,
    source: searchParams.get("source")?.trim() || undefined,
    lifecycleStage: searchParams.get("lifecycleStage")?.trim() || undefined,
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
