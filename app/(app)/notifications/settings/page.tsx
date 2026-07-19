import { NotificationsSettingsManager } from "@/components/notifications/settings-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireNotificationsWorkspace } from "@/lib/notifications/access";
import {
  ensureWorkspaceNotifications,
  toPublicSettings,
} from "@/lib/notifications/repository";

export default async function NotificationsSettingsPage() {
  const { workspace, role } = await requireNotificationsWorkspace(
    "/notifications/settings",
  );
  return (
    <NotificationsSettingsManager
      settings={toPublicSettings(ensureWorkspaceNotifications(workspace.id))}
      canManage={isWorkspaceManager(role)}
    />
  );
}
