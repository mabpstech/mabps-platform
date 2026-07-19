import { NextResponse } from "next/server";
import { requireNotificationsMemberApi } from "@/lib/notifications/access";
import {
  notificationsErrorResponse,
  parseNotificationListFilters,
} from "@/lib/notifications/http";
import {
  ensureWorkspaceNotifications,
  listNotificationLogs,
} from "@/lib/notifications/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      logs: listNotificationLogs(
        workspace.id,
        parseNotificationListFilters(searchParams),
      ),
    });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
