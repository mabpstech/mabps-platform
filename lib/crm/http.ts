import { NextResponse } from "next/server";
import { CrmAuthError } from "@/lib/crm/access";

export function crmErrorResponse(error: unknown) {
  if (error instanceof CrmAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected CRM error.";

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
  }

  console.error("[crm]", error);
  return NextResponse.json({ error: message }, { status });
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
