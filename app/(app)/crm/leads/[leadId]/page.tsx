import { notFound } from "next/navigation";
import { LeadDetail } from "@/components/crm/record-detail";
import { requireCrmWorkspace } from "@/lib/crm/access";
import {
  getLeadById,
  listNotes,
  listTags,
  listTagsForEntity,
} from "@/lib/crm/repository";

type PageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function CrmLeadPage({ params }: PageProps) {
  const { workspace } = await requireCrmWorkspace("/crm/leads");
  const { leadId } = await params;
  const lead = getLeadById(leadId);
  if (!lead || lead.workspaceId !== workspace.id) notFound();

  return (
    <LeadDetail
      lead={lead}
      notes={listNotes(workspace.id, { entityType: "lead", entityId: leadId })}
      tags={listTagsForEntity(workspace.id, "lead", leadId)}
      allTags={listTags(workspace.id)}
    />
  );
}
