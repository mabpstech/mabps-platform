import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { ensureWorkspaceCrm, getCrmOverview } from "@/lib/crm/repository";

export async function GET() {
  try {
    const { workspace } = await requireCrmMemberApi();
    ensureWorkspaceCrm(workspace.id);
    const stats = getCrmOverview(workspace.id);
    return NextResponse.json({ stats });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
