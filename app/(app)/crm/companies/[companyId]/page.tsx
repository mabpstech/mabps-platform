import { notFound } from "next/navigation";
import { CompanyDetail } from "@/components/crm/record-detail";
import { requireCrmWorkspace } from "@/lib/crm/access";
import {
  getCompanyById,
  listNotes,
  listTags,
  listTagsForEntity,
} from "@/lib/crm/repository";

type PageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function CrmCompanyPage({ params }: PageProps) {
  const { workspace } = await requireCrmWorkspace("/crm/companies");
  const { companyId } = await params;
  const company = getCompanyById(companyId);
  if (!company || company.workspaceId !== workspace.id) notFound();

  const notes = listNotes(workspace.id, {
    entityType: "company",
    entityId: companyId,
  });
  const tags = listTagsForEntity(workspace.id, "company", companyId);
  const allTags = listTags(workspace.id);

  return (
    <CompanyDetail
      company={company}
      notes={notes}
      tags={tags}
      allTags={allTags}
    />
  );
}
