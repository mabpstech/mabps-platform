import { createActivity } from "@/lib/crm/repository";
import { CRM_ENTITY_TYPES, type CrmEntityType } from "@/lib/crm/types";
import { ensureWorkspaceNotifications } from "@/lib/notifications/repository";
import type { AppNotification } from "@/lib/notifications/types";

function isCrmEntityType(value: string): value is CrmEntityType {
  return (CRM_ENTITY_TYPES as readonly string[]).includes(value);
}

/**
 * Log a CRM activity when a notification targets a CRM entity.
 */
export function syncNotificationToCrm(input: {
  workspaceId: string;
  notification: AppNotification;
}): void {
  const settings = ensureWorkspaceNotifications(input.workspaceId);
  if (!settings.crmSyncEnabled) return;

  const { notification } = input;
  if (!notification.crmEntityType || !notification.crmEntityId) return;
  if (!isCrmEntityType(notification.crmEntityType)) return;

  try {
    createActivity({
      workspaceId: input.workspaceId,
      entityType: notification.crmEntityType,
      entityId: notification.crmEntityId,
      type: "message",
      subject: `Notification: ${notification.title}`,
      body: notification.body,
      createdByUserId: notification.createdByUserId,
    });
  } catch (error) {
    console.error("[notifications:crm-sync]", error);
  }
}
