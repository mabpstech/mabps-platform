import { NextResponse } from "next/server";
import { requireNotificationsMemberApi } from "@/lib/notifications/access";
import { notificationsErrorResponse } from "@/lib/notifications/http";
import { getNotificationsOverview } from "@/lib/notifications/repository";

export async function GET() {
  try {
    const { workspace } = await requireNotificationsMemberApi();
    return NextResponse.json({
      overview: getNotificationsOverview(workspace.id),
    });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
