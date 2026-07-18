import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse, parseListFilters } from "@/lib/crm/http";
import { createActivity, listActivities } from "@/lib/crm/repository";
import type { ActivityType, CrmEntityType } from "@/lib/crm/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const searchParams = new URL(request.url).searchParams;
    const filters = parseListFilters(searchParams);
    const activities = listActivities(workspace.id, {
      ...filters,
      entityType:
        (searchParams.get("entityType") as CrmEntityType | null) || undefined,
      entityId: searchParams.get("entityId") || undefined,
    });
    return NextResponse.json({ activities });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.entityType !== "string" || typeof body.entityId !== "string") {
      return NextResponse.json(
        { error: "entityType and entityId are required." },
        { status: 400 },
      );
    }
    if (typeof body.subject !== "string" || !body.subject.trim()) {
      return NextResponse.json(
        { error: "Activity subject is required." },
        { status: 400 },
      );
    }
    if (typeof body.type !== "string") {
      return NextResponse.json(
        { error: "Activity type is required." },
        { status: 400 },
      );
    }

    const activity = createActivity({
      workspaceId: workspace.id,
      entityType: body.entityType as CrmEntityType,
      entityId: body.entityId,
      type: body.type as ActivityType,
      subject: body.subject,
      body: typeof body.body === "string" ? body.body : null,
      occurredAt:
        typeof body.occurredAt === "string" ? body.occurredAt : null,
      createdByUserId: session.user.id,
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
