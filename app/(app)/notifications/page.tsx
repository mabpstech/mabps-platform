import { NotificationsOverview } from "@/components/notifications/notifications-overview";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireNotificationsWorkspace } from "@/lib/notifications/access";
import { getNotificationsOverview } from "@/lib/notifications/repository";

export default async function NotificationsPage() {
  const { workspace, role } = await requireNotificationsWorkspace(
    "/notifications",
  );
  return (
    <NotificationsOverview
      stats={getNotificationsOverview(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
