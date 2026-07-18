import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse, parseListFilters } from "@/lib/crm/http";
import { createTask, listTasks } from "@/lib/crm/repository";
import type {
  CrmEntityType,
  TaskPriority,
  TaskStatus,
} from "@/lib/crm/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const searchParams = new URL(request.url).searchParams;
    const filters = parseListFilters(searchParams);
    const tasks = listTasks(workspace.id, {
      ...filters,
      entityType:
        (searchParams.get("entityType") as CrmEntityType | null) || undefined,
      entityId: searchParams.get("entityId") || undefined,
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 },
      );
    }

    const task = createTask({
      workspaceId: workspace.id,
      title: body.title,
      description:
        typeof body.description === "string" ? body.description : null,
      entityType:
        typeof body.entityType === "string"
          ? (body.entityType as CrmEntityType)
          : null,
      entityId: typeof body.entityId === "string" ? body.entityId : null,
      status:
        typeof body.status === "string"
          ? (body.status as TaskStatus)
          : "open",
      priority:
        typeof body.priority === "string"
          ? (body.priority as TaskPriority)
          : "medium",
      dueAt: typeof body.dueAt === "string" ? body.dueAt : null,
      assigneeUserId:
        typeof body.assigneeUserId === "string"
          ? body.assigneeUserId
          : session.user.id,
      createdByUserId: session.user.id,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
