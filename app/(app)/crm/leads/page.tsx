import { LeadsManager } from "@/components/crm/leads-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireCrmWorkspace } from "@/lib/crm/access";
import { listLeads, listTags } from "@/lib/crm/repository";

export default async function CrmLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, role } = await requireCrmWorkspace("/crm/leads");
  const params = await searchParams;

  const leads = listLeads(workspace.id, {
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    source: typeof params.source === "string" ? params.source : undefined,
    tagId: typeof params.tagId === "string" ? params.tagId : undefined,
    limit: 200,
  });

  return (
    <LeadsManager
      leads={leads}
      tags={listTags(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
