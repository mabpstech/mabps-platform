import { NextResponse } from "next/server";
import {
  requireNotificationsManagerApi,
  requireNotificationsMemberApi,
} from "@/lib/notifications/access";
import {
  notificationsErrorResponse,
  parseNotificationCategory,
  parseNotificationChannels,
  parseNotificationListFilters,
  parseNotificationPriority,
  parseNotificationTemplateStatus,
} from "@/lib/notifications/http";
import {
  createTemplate,
  ensureWorkspaceNotifications,
  listTemplates,
} from "@/lib/notifications/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      templates: listTemplates(
        workspace.id,
        parseNotificationListFilters(searchParams),
      ),
    });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireNotificationsManagerApi();
    ensureWorkspaceNotifications(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const bodyText = typeof body.body === "string" ? body.body.trim() : "";
    if (!name || !title || !bodyText) {
      throw new Error("name, title, and body are required.");
    }

    const template = createTemplate({
      workspaceId: workspace.id,
      name,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      category: parseNotificationCategory(body.category) || undefined,
      title,
      body: bodyText,
      channels: parseNotificationChannels(body.channels) || undefined,
      priority: parseNotificationPriority(body.priority) || undefined,
      variables: Array.isArray(body.variables)
        ? body.variables.map((item) => String(item))
        : undefined,
      status: parseNotificationTemplateStatus(body.status) || undefined,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
