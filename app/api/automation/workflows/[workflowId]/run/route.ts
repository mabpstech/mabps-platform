import { NextResponse } from "next/server";
import { requireAutomationMemberApi } from "@/lib/automation/access";
import { automationErrorResponse } from "@/lib/automation/http";
import { createRun, getWorkflowById } from "@/lib/automation/repository";

type RouteContext = { params: Promise<{ workflowId: string }> };

/** Manually enqueue a workflow run (drained by the background worker). */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireAutomationMemberApi();
    const { workflowId } = await context.params;
    const workflow = getWorkflowById(workflowId);
    if (!workflow || workflow.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const payload =
      body.payload && typeof body.payload === "object"
        ? (body.payload as Record<string, unknown>)
        : {};

    const run = createRun({
      workspaceId: workspace.id,
      workflowId,
      triggerType: "manual",
      triggerPayload: payload,
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
