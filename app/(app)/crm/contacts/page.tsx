import { ContactsManager } from "@/components/crm/contacts-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireCrmWorkspace } from "@/lib/crm/access";
import {
  listCompanies,
  listContacts,
  listTags,
} from "@/lib/crm/repository";

export default async function CrmContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, role } = await requireCrmWorkspace("/crm/contacts");
  const params = await searchParams;

  const contacts = listContacts(workspace.id, {
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    companyId:
      typeof params.companyId === "string" ? params.companyId : undefined,
    tagId: typeof params.tagId === "string" ? params.tagId : undefined,
    limit: 200,
  });
  const companies = listCompanies(workspace.id, { limit: 500 });
  const tags = listTags(workspace.id);

  return (
    <ContactsManager
      contacts={contacts}
      companies={companies}
      tags={tags}
      canManage={isWorkspaceManager(role)}
    />
  );
}
