import { NextResponse } from "next/server";
import { requireNotificationsMemberApi } from "@/lib/notifications/access";
import { notificationsErrorResponse } from "@/lib/notifications/http";
import {
  ensurePreference,
  ensureWorkspaceNotifications,
  updatePreference,
} from "@/lib/notifications/repository";
import type { NotificationChannel } from "@/lib/notifications/types";
import { NOTIFICATION_CHANNELS } from "@/lib/notifications/types";

export async function GET() {
  try {
    const { workspace, session } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    return NextResponse.json({
      preferences: ensurePreference(workspace.id, session.user.id),
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

    let categoryOverrides:
      | Record<string, NotificationChannel[]>
      | undefined;
    if (body.categoryOverrides && typeof body.categoryOverrides === "object") {
      categoryOverrides = {};
      for (const [key, value] of Object.entries(
        body.categoryOverrides as Record<string, unknown>,
      )) {
        if (!Array.isArray(value)) continue;
        const channels = value.filter((item): item is NotificationChannel =>
          typeof item === "string" &&
          NOTIFICATION_CHANNELS.includes(item as NotificationChannel),
        );
        categoryOverrides[key] = channels;
      }
    }

    const preferences = updatePreference(workspace.id, session.user.id, {
      inAppEnabled:
        typeof body.inAppEnabled === "boolean" ? body.inAppEnabled : undefined,
      pushEnabled:
        typeof body.pushEnabled === "boolean" ? body.pushEnabled : undefined,
      emailEnabled:
        typeof body.emailEnabled === "boolean" ? body.emailEnabled : undefined,
      whatsappEnabled:
        typeof body.whatsappEnabled === "boolean"
          ? body.whatsappEnabled
          : undefined,
      browserEnabled:
        typeof body.browserEnabled === "boolean"
          ? body.browserEnabled
          : undefined,
      quietHoursStart:
        typeof body.quietHoursStart === "string" ||
        body.quietHoursStart === null
          ? (body.quietHoursStart as string | null)
          : undefined,
      quietHoursEnd:
        typeof body.quietHoursEnd === "string" || body.quietHoursEnd === null
          ? (body.quietHoursEnd as string | null)
          : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      categoryOverrides,
      emailAddress:
        typeof body.emailAddress === "string" || body.emailAddress === null
          ? (body.emailAddress as string | null)
          : undefined,
      phoneNumber:
        typeof body.phoneNumber === "string" || body.phoneNumber === null
          ? (body.phoneNumber as string | null)
          : undefined,
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
