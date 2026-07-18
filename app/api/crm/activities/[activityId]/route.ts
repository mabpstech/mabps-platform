import { NextResponse } from "next/server";
import { requireCrmManagerApi, requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { deleteActivity, updateActivity } from "@/lib/crm/repository";
import type { ActivityType } from "@/lib/crm/types";

type RouteContext = { params: Promise<{ activityId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { activityId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const activity = updateActivity(activityId, workspace.id, {
      type: typeof body.type === "string" ? (body.type as ActivityType) : undefined,
      subject: typeof body.subject === "string" ? body.subject : undefined,
      body:
        body.body === null || typeof body.body === "string"
          ? (body.body as string | null)
          : undefined,
      occurredAt:
        typeof body.occurredAt === "string" ? body.occurredAt : undefined,
    });
    return NextResponse.json({ activity });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { activityId } = await context.params;
    deleteActivity(activityId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
