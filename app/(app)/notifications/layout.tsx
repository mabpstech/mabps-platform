import { NotificationsSubnav } from "@/components/notifications/notifications-subnav";
import { requireNotificationsWorkspace } from "@/lib/notifications/access";
import { ensureWorkspaceNotifications } from "@/lib/notifications/repository";

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireNotificationsWorkspace("/notifications");
  ensureWorkspaceNotifications(workspace.id);

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <NotificationsSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
