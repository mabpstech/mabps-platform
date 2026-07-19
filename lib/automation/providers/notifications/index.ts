import { sendWorkspaceNotification } from "@/lib/notifications/engine/send";
import { ensureWorkspaceNotifications } from "@/lib/notifications/repository";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPriority,
} from "@/lib/notifications/types";
import type {
  NotificationAutomationProvider,
  NotificationAutomationProviderConfig,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from "@/lib/automation/providers/notifications/types";

type RuntimeConfig = NotificationAutomationProviderConfig & {
  workspaceId?: string;
};

function asChannel(value: string): NotificationChannel | null {
  return NOTIFICATION_CHANNELS.includes(value as NotificationChannel)
    ? (value as NotificationChannel)
    : null;
}

/**
 * Workspace Notifications provider for Automation `notification.send`.
 */
export const workspaceNotificationsProvider: NotificationAutomationProvider = {
  id: "notifications",
  isImplemented: true,
  async sendNotification(
    config: RuntimeConfig,
    input: NotificationProviderSendInput,
  ): Promise<NotificationProviderSendResult> {
    try {
      if (!config.workspaceId) {
        return { ok: false, error: "notification.send requires workspaceId." };
      }

      ensureWorkspaceNotifications(config.workspaceId);

      const channels = (input.channels || [])
        .map(asChannel)
        .filter((item): item is NotificationChannel => Boolean(item));

      const category =
        input.category &&
        NOTIFICATION_CATEGORIES.includes(
          input.category as NotificationCategory,
        )
          ? (input.category as NotificationCategory)
          : undefined;

      const priority =
        input.priority &&
        NOTIFICATION_PRIORITIES.includes(
          input.priority as NotificationPriority,
        )
          ? (input.priority as NotificationPriority)
          : undefined;

      const result = await sendWorkspaceNotification(config.workspaceId, {
        userId: input.userId,
        title: input.title,
        body: input.body,
        href: input.href,
        category,
        priority,
        channels: channels.length ? channels : undefined,
        templateId: input.templateId,
        variables: input.variables,
        email: input.email,
        phone: input.phone,
        crmEntityType: input.crmEntityType,
        crmEntityId: input.crmEntityId,
        metadata: input.metadata,
      });

      if (result.notification.status === "failed") {
        return {
          ok: false,
          error: result.notification.errorMessage || "Notification failed.",
          notificationId: result.notification.id,
          raw: { deliveries: result.deliveries },
        };
      }

      return {
        ok: true,
        notificationId: result.notification.id,
        raw: {
          status: result.notification.status,
          channels: result.notification.channels,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Notification send failed.",
      };
    }
  },
};

const providers: Record<string, NotificationAutomationProvider> = {
  notifications: workspaceNotificationsProvider,
};

export function getNotificationProvider(
  id = "notifications",
): NotificationAutomationProvider {
  return providers[id] ?? workspaceNotificationsProvider;
}

export type {
  NotificationAutomationProvider,
  NotificationAutomationProviderConfig,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
};
