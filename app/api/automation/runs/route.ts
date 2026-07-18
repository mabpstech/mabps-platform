import { NextResponse } from "next/server";
import { requireAutomationMemberApi } from "@/lib/automation/access";
import { automationErrorResponse, parseAutomationListFilters } from "@/lib/automation/http";
import { listRuns } from "@/lib/automation/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireAutomationMemberApi();
    const { searchParams } = new URL(request.url);
    const filters = parseAutomationListFilters(searchParams);
    return NextResponse.json({
      runs: listRuns(workspace.id, {
        workflowId: filters.workflowId,
        status: filters.status,
        limit: filters.limit,
        offset: filters.offset,
      }),
    });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
