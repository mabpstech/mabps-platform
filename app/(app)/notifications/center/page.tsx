import { NotificationsCenterPanel } from "@/components/notifications/center-panel";
import { requireNotificationsWorkspace } from "@/lib/notifications/access";
import {
  listNotifications,
  listTemplates,
} from "@/lib/notifications/repository";

export default async function NotificationsCenterPage() {
  const { workspace, session } = await requireNotificationsWorkspace(
    "/notifications/center",
  );

  return (
    <NotificationsCenterPanel
      notifications={listNotifications(workspace.id, {
        userId: session.user.id,
        limit: 100,
      })}
      templates={listTemplates(workspace.id, { status: "active", limit: 100 })}
      unreadCount={
        listNotifications(workspace.id, {
          userId: session.user.id,
          unreadOnly: true,
          limit: 500,
        }).length
      }
    />
  );
}
