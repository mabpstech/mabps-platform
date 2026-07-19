import { NextResponse } from "next/server";
import { requireNotificationsMemberApi } from "@/lib/notifications/access";
import { notificationsErrorResponse } from "@/lib/notifications/http";
import {
  ensureWorkspaceNotifications,
  getNotificationById,
  listDeliveries,
  markNotificationRead,
} from "@/lib/notifications/repository";

type Params = { params: Promise<{ notificationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    const { notificationId } = await params;
    const notification = getNotificationById(workspace.id, notificationId);
    if (!notification) throw new Error("Notification not found.");
    return NextResponse.json({
      notification,
      deliveries: listDeliveries(workspace.id, notificationId),
    });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { workspace, session } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    const { notificationId } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    if (body.isRead === true || body.markRead === true) {
      const notification = markNotificationRead(
        workspace.id,
        notificationId,
        session.user.id,
      );
      return NextResponse.json({ notification });
    }

    throw new Error("Unsupported update. Use { isRead: true }.");
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
