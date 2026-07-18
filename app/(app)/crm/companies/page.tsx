import { CompaniesManager } from "@/components/crm/companies-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireCrmWorkspace } from "@/lib/crm/access";
import { listCompanies, listTags } from "@/lib/crm/repository";

export default async function CrmCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, role } = await requireCrmWorkspace("/crm/companies");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const tagId = typeof params.tagId === "string" ? params.tagId : undefined;

  const companies = listCompanies(workspace.id, { q, tagId, limit: 200 });
  const tags = listTags(workspace.id);

  return (
    <CompaniesManager
      companies={companies}
      tags={tags}
      canManage={isWorkspaceManager(role)}
    />
  );
}
