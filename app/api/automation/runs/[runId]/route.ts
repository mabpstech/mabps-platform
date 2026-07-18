import { NextResponse } from "next/server";
import { requireAutomationMemberApi } from "@/lib/automation/access";
import { automationErrorResponse } from "@/lib/automation/http";
import {
  getRunById,
  getWorkflowById,
  listRunLogs,
  listRunSteps,
} from "@/lib/automation/repository";

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireAutomationMemberApi();
    const { runId } = await context.params;
    const run = getRunById(runId);
    if (!run || run.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }
    const workflow = getWorkflowById(run.workflowId);
    return NextResponse.json({
      run,
      workflow,
      steps: listRunSteps(runId),
      logs: listRunLogs(runId),
    });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
