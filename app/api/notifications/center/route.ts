import { NextResponse } from "next/server";
import { processAutomationQueue } from "@/lib/automation/engine/runner";
import { emitNotificationEvent } from "@/lib/automation/events";
import { requireNotificationsMemberApi } from "@/lib/notifications/access";
import { recordNotificationAnalyticsEvent } from "@/lib/notifications/engine/analytics";
import {
  notificationsErrorResponse,
  parseNotificationListFilters,
} from "@/lib/notifications/http";
import {
  ensureWorkspaceNotifications,
  getNotificationSettings,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/repository";
import { createNotificationEvent } from "@/lib/notifications/repository";

export async function GET(request: Request) {
  try {
    const { workspace, session } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    const { searchParams } = new URL(request.url);
    const filters = parseNotificationListFilters(searchParams);
    const scope = searchParams.get("scope");

    return NextResponse.json({
      notifications: listNotifications(workspace.id, {
        ...filters,
        userId:
          scope === "workspace" && searchParams.get("userId")
            ? filters.userId
            : session.user.id,
      }),
    });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { workspace, session } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;
    const settings = getNotificationSettings(workspace.id);

    if (body.markAllRead === true) {
      const updated = markAllNotificationsRead(workspace.id, session.user.id);
      return NextResponse.json({ updated });
    }

    const notificationId =
      typeof body.notificationId === "string" ? body.notificationId : "";
    if (!notificationId) throw new Error("notificationId is required.");

    const notification = markNotificationRead(
      workspace.id,
      notificationId,
      session.user.id,
    );

    createNotificationEvent({
      workspaceId: workspace.id,
      notificationId: notification.id,
      userId: session.user.id,
      type: "read",
    });

    recordNotificationAnalyticsEvent({
      workspaceId: workspace.id,
      name: "notification.read",
      entityType: "notification",
      entityId: notification.id,
      userId: session.user.id,
      enabled: settings?.analyticsEnabled,
    });

    if (settings?.automationEnabled) {
      emitNotificationEvent(workspace.id, "notification.read", {
        notificationId: notification.id,
        userId: session.user.id,
      });
      void processAutomationQueue({ limit: 10 }).catch(() => undefined);
    }

    return NextResponse.json({ notification });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
