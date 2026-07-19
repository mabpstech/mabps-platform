import { NotificationsPreferencesPanel } from "@/components/notifications/preferences-panel";
import { requireNotificationsWorkspace } from "@/lib/notifications/access";
import { ensurePreference } from "@/lib/notifications/repository";

export default async function NotificationsPreferencesPage() {
  const { workspace, session } = await requireNotificationsWorkspace(
    "/notifications/preferences",
  );
  return (
    <NotificationsPreferencesPanel
      preferences={ensurePreference(workspace.id, session.user.id)}
    />
  );
}
