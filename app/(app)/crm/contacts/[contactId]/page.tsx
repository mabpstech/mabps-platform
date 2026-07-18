import { notFound } from "next/navigation";
import { ContactDetail } from "@/components/crm/record-detail";
import { requireCrmWorkspace } from "@/lib/crm/access";
import {
  getContactById,
  listCompanies,
  listNotes,
  listTags,
  listTagsForEntity,
} from "@/lib/crm/repository";

type PageProps = {
  params: Promise<{ contactId: string }>;
};

export default async function CrmContactPage({ params }: PageProps) {
  const { workspace } = await requireCrmWorkspace("/crm/contacts");
  const { contactId } = await params;
  const contact = getContactById(contactId);
  if (!contact || contact.workspaceId !== workspace.id) notFound();

  return (
    <ContactDetail
      contact={contact}
      notes={listNotes(workspace.id, {
        entityType: "contact",
        entityId: contactId,
      })}
      tags={listTagsForEntity(workspace.id, "contact", contactId)}
      allTags={listTags(workspace.id)}
      companies={listCompanies(workspace.id, { limit: 500 })}
    />
  );
}
