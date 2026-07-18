import { NextResponse } from "next/server";
import { requireAutomationMemberApi } from "@/lib/automation/access";
import { automationErrorResponse, parseAutomationListFilters } from "@/lib/automation/http";
import { createWorkflow, listWorkflows } from "@/lib/automation/repository";
import type { TriggerType, WorkflowStatus } from "@/lib/automation/types";
import { TRIGGER_TYPES, WORKFLOW_STATUSES } from "@/lib/automation/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireAutomationMemberApi();
    const { searchParams } = new URL(request.url);
    const filters = parseAutomationListFilters(searchParams);
    return NextResponse.json({
      workflows: listWorkflows(workspace.id, {
        q: filters.q,
        status: filters.status,
        triggerType: filters.triggerType,
      }),
    });
  } catch (error) {
    return automationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireAutomationMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const triggerType =
      typeof body.triggerType === "string" &&
      (TRIGGER_TYPES as readonly string[]).includes(body.triggerType)
        ? (body.triggerType as TriggerType)
        : "manual";

    const status =
      typeof body.status === "string" &&
      (WORKFLOW_STATUSES as readonly string[]).includes(body.status)
        ? (body.status as WorkflowStatus)
        : "draft";

    const workflow = createWorkflow({
      workspaceId: workspace.id,
      name: body.name,
      description:
        typeof body.description === "string" ? body.description : null,
      triggerType,
      triggerConfig:
        body.triggerConfig && typeof body.triggerConfig === "object"
          ? (body.triggerConfig as Record<string, unknown>)
          : {},
      definition: Array.isArray(body.definition)
        ? (body.definition as never)
        : undefined,
      status,
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
