import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { searchCrm } from "@/lib/crm/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const results = searchCrm(workspace.id, q);
    return NextResponse.json({ results, q });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
