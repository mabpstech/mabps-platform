import { EmailContactsPanel } from "@/components/email/contacts-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireEmailWorkspace } from "@/lib/email-engine/access";
import { listContacts } from "@/lib/email-engine/repository";

export default async function EmailContactsPage() {
  const { workspace, role } = await requireEmailWorkspace("/email/contacts");
  return (
    <EmailContactsPanel
      contacts={listContacts(workspace.id, { limit: 200 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
