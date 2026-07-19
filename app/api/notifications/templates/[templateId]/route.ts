import { NextResponse } from "next/server";
import {
  requireNotificationsManagerApi,
  requireNotificationsMemberApi,
} from "@/lib/notifications/access";
import {
  notificationsErrorResponse,
  parseNotificationCategory,
  parseNotificationChannels,
  parseNotificationPriority,
  parseNotificationTemplateStatus,
} from "@/lib/notifications/http";
import {
  deleteTemplate,
  ensureWorkspaceNotifications,
  getTemplateById,
  updateTemplate,
} from "@/lib/notifications/repository";

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    const { templateId } = await params;
    const template = getTemplateById(workspace.id, templateId);
    if (!template) throw new Error("Template not found.");
    return NextResponse.json({ template });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { workspace } = await requireNotificationsManagerApi();
    ensureWorkspaceNotifications(workspace.id);
    const { templateId } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const template = updateTemplate(workspace.id, templateId, {
      name: typeof body.name === "string" ? body.name : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      category: parseNotificationCategory(body.category) || undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
      channels: parseNotificationChannels(body.channels) || undefined,
      priority: parseNotificationPriority(body.priority) || undefined,
      variables: Array.isArray(body.variables)
        ? body.variables.map((item) => String(item))
        : undefined,
      status: parseNotificationTemplateStatus(body.status) || undefined,
    });

    return NextResponse.json({ template });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireNotificationsManagerApi();
    ensureWorkspaceNotifications(workspace.id);
    const { templateId } = await params;
    const deleted = deleteTemplate(workspace.id, templateId);
    if (!deleted) throw new Error("Template not found.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
