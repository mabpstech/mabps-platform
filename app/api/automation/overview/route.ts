import { NextResponse } from "next/server";
import { requireAutomationMemberApi } from "@/lib/automation/access";
import { automationErrorResponse } from "@/lib/automation/http";
import { getAutomationOverview } from "@/lib/automation/repository";

export async function GET() {
  try {
    const { workspace } = await requireAutomationMemberApi();
    return NextResponse.json({
      overview: getAutomationOverview(workspace.id),
    });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
