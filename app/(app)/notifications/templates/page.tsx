import { NotificationsTemplatesPanel } from "@/components/notifications/templates-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireNotificationsWorkspace } from "@/lib/notifications/access";
import { listTemplates } from "@/lib/notifications/repository";

export default async function NotificationsTemplatesPage() {
  const { workspace, role } = await requireNotificationsWorkspace(
    "/notifications/templates",
  );
  return (
    <NotificationsTemplatesPanel
      templates={listTemplates(workspace.id, { limit: 100 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
