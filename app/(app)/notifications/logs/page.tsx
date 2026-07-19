import { NotificationsLogsPanel } from "@/components/notifications/logs-panel";
import { requireNotificationsWorkspace } from "@/lib/notifications/access";
import {
  listNotificationEvents,
  listNotificationLogs,
} from "@/lib/notifications/repository";

export default async function NotificationsLogsPage() {
  const { workspace } = await requireNotificationsWorkspace(
    "/notifications/logs",
  );
  return (
    <NotificationsLogsPanel
      logs={listNotificationLogs(workspace.id, { limit: 100 })}
      events={listNotificationEvents(workspace.id, { limit: 100 })}
    />
  );
}
