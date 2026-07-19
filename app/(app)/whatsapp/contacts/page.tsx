import { ContactsPanel } from "@/components/whatsapp/contacts-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWhatsAppWorkspace } from "@/lib/whatsapp/access";
import { listContacts } from "@/lib/whatsapp/repository";

export default async function WhatsAppContactsPage() {
  const { workspace, role } = await requireWhatsAppWorkspace(
    "/whatsapp/contacts",
  );
  return (
    <ContactsPanel
      contacts={listContacts(workspace.id, { limit: 200 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
