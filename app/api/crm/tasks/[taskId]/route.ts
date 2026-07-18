import { NextResponse } from "next/server";
import { requireCrmManagerApi, requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { deleteTask, updateTask } from "@/lib/crm/repository";
import type {
  CrmEntityType,
  TaskPriority,
  TaskStatus,
} from "@/lib/crm/types";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const { taskId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const task = updateTask(
      taskId,
      workspace.id,
      {
        title: typeof body.title === "string" ? body.title : undefined,
        description:
          body.description === null || typeof body.description === "string"
            ? (body.description as string | null)
            : undefined,
        entityType:
          body.entityType === null || typeof body.entityType === "string"
            ? (body.entityType as CrmEntityType | null)
            : undefined,
        entityId:
          body.entityId === null || typeof body.entityId === "string"
            ? (body.entityId as string | null)
            : undefined,
        status:
          typeof body.status === "string"
            ? (body.status as TaskStatus)
            : undefined,
        priority:
          typeof body.priority === "string"
            ? (body.priority as TaskPriority)
            : undefined,
        dueAt:
          body.dueAt === null || typeof body.dueAt === "string"
            ? (body.dueAt as string | null)
            : undefined,
        assigneeUserId:
          body.assigneeUserId === null || typeof body.assigneeUserId === "string"
            ? (body.assigneeUserId as string | null)
            : undefined,
      },
      session.user.id,
    );
    return NextResponse.json({ task });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { taskId } = await context.params;
    deleteTask(taskId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
