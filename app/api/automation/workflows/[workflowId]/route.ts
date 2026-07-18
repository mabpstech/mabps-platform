import { NextResponse } from "next/server";
import {
  requireAutomationManagerApi,
  requireAutomationMemberApi,
} from "@/lib/automation/access";
import { automationErrorResponse } from "@/lib/automation/http";
import {
  deleteWorkflow,
  getWorkflowById,
  updateWorkflow,
} from "@/lib/automation/repository";
import type { TriggerType, WorkflowDefinition, WorkflowStatus } from "@/lib/automation/types";
import { TRIGGER_TYPES, WORKFLOW_STATUSES } from "@/lib/automation/types";

type RouteContext = { params: Promise<{ workflowId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireAutomationMemberApi();
    const { workflowId } = await context.params;
    const workflow = getWorkflowById(workflowId);
    if (!workflow || workflow.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }
    return NextResponse.json({ workflow });
  } catch (error) {
    return automationErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireAutomationMemberApi();
    const { workflowId } = await context.params;
    const existing = getWorkflowById(workflowId);
    if (!existing || existing.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const workflow = updateWorkflow(workflowId, workspace.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        body.description === undefined
          ? undefined
          : typeof body.description === "string"
            ? body.description
            : null,
      status:
        typeof body.status === "string" &&
        (WORKFLOW_STATUSES as readonly string[]).includes(body.status)
          ? (body.status as WorkflowStatus)
          : undefined,
      triggerType:
        typeof body.triggerType === "string" &&
        (TRIGGER_TYPES as readonly string[]).includes(body.triggerType)
          ? (body.triggerType as TriggerType)
          : undefined,
      triggerConfig:
        body.triggerConfig && typeof body.triggerConfig === "object"
          ? (body.triggerConfig as Record<string, unknown>)
          : undefined,
      definition: Array.isArray(body.definition)
        ? (body.definition as WorkflowDefinition)
        : undefined,
      rotateWebhookSecret: body.rotateWebhookSecret === true,
      rotateApiKey: body.rotateApiKey === true,
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    return automationErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireAutomationManagerApi();
    const { workflowId } = await context.params;
    const existing = getWorkflowById(workflowId);
    if (!existing || existing.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }
    deleteWorkflow(workflowId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
