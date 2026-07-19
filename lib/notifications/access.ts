import { createModuleAccess } from "@/lib/platform/access";
import { ensureNotificationsReady } from "@/lib/notifications/repository";

const access = createModuleAccess({
  errorName: "NotificationsAuthError",
  ensureReady: ensureNotificationsReady,
  managerMessage:
    "Only workspace owners and admins can perform this Notifications action.",
});

export const NotificationsAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireNotificationsWorkspace(callbackUrl = "/notifications") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireNotificationsMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireNotificationsManagerApi() {
  return access.requireManagerApi();
}
