import { NextResponse } from "next/server";
import {
  requireNotificationsManagerApi,
  requireNotificationsMemberApi,
} from "@/lib/notifications/access";
import {
  notificationsErrorResponse,
  parseNotificationChannels,
  parseNotificationPriority,
} from "@/lib/notifications/http";
import {
  ensureWorkspaceNotifications,
  toPublicSettings,
  updateNotificationSettings,
} from "@/lib/notifications/repository";

export async function GET() {
  try {
    const { workspace } = await requireNotificationsMemberApi();
    return NextResponse.json({
      settings: toPublicSettings(ensureWorkspaceNotifications(workspace.id)),
    });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { workspace } = await requireNotificationsManagerApi();
    ensureWorkspaceNotifications(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;
    const defaultChannels = parseNotificationChannels(body.defaultChannels);
    const defaultPriority = parseNotificationPriority(body.defaultPriority);

    const settings = updateNotificationSettings(workspace.id, {
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
      defaultChannels: defaultChannels || undefined,
      defaultPriority: defaultPriority || undefined,
      crmSyncEnabled:
        typeof body.crmSyncEnabled === "boolean"
          ? body.crmSyncEnabled
          : undefined,
      automationEnabled:
        typeof body.automationEnabled === "boolean"
          ? body.automationEnabled
          : undefined,
      analyticsEnabled:
        typeof body.analyticsEnabled === "boolean"
          ? body.analyticsEnabled
          : undefined,
      pushEndpoint:
        typeof body.pushEndpoint === "string" || body.pushEndpoint === null
          ? (body.pushEndpoint as string | null)
          : undefined,
      regenerateVapidKeys: body.regenerateVapidKeys === true,
    });

    return NextResponse.json({ settings: toPublicSettings(settings) });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
