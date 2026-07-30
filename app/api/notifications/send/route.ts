import { NextResponse } from "next/server";
import { requireNotificationsManagerApi } from "@/lib/notifications/access";
import { sendWorkspaceNotification } from "@/lib/notifications/engine/send";
import {
  notificationsErrorResponse,
  parseNotificationCategory,
  parseNotificationChannels,
  parseNotificationPriority,
} from "@/lib/notifications/http";
import { ensureWorkspaceNotifications } from "@/lib/notifications/repository";

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireNotificationsManagerApi();
    ensureWorkspaceNotifications(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const bodyText = typeof body.body === "string" ? body.body.trim() : "";
    if (!title && !body.templateId) {
      throw new Error("title or templateId is required.");
    }
    if (!bodyText && !body.templateId) {
      throw new Error("body or templateId is required.");
    }

    const result = await sendWorkspaceNotification(workspace.id, {
      userId:
        typeof body.userId === "string"
          ? body.userId
          : body.userId === null
            ? null
            : session.user.id,
      title: title || "Notification",
      body: bodyText || " ",
      href: typeof body.href === "string" ? body.href : null,
      category: parseNotificationCategory(body.category) || undefined,
      priority: parseNotificationPriority(body.priority) || undefined,
      channels: parseNotificationChannels(body.channels) || undefined,
      templateId:
        typeof body.templateId === "string" ? body.templateId : null,
      variables:
        body.variables && typeof body.variables === "object"
          ? Object.fromEntries(
              Object.entries(body.variables as Record<string, unknown>).map(
                ([key, value]) => [key, String(value ?? "")],
              ),
            )
          : undefined,
      email: typeof body.email === "string" ? body.email : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      crmEntityType:
        typeof body.crmEntityType === "string" ? body.crmEntityType : null,
      crmEntityId:
        typeof body.crmEntityId === "string" ? body.crmEntityId : null,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
      createdByUserId: session.user.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
