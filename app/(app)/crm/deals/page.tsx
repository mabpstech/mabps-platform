import { DealsManager } from "@/components/crm/deals-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireCrmWorkspace } from "@/lib/crm/access";
import {
  ensureWorkspaceCrm,
  listCustomers,
  listDeals,
  listPipelineStages,
  listTags,
} from "@/lib/crm/repository";

export default async function CrmDealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, role } = await requireCrmWorkspace("/crm/deals");
  const params = await searchParams;
  const pipeline = ensureWorkspaceCrm(workspace.id);

  const deals = listDeals(workspace.id, {
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    stageId: typeof params.stageId === "string" ? params.stageId : undefined,
    tagId: typeof params.tagId === "string" ? params.tagId : undefined,
    limit: 200,
  });

  return (
    <DealsManager
      deals={deals}
      stages={listPipelineStages(pipeline.id)}
      customers={listCustomers(workspace.id, { limit: 500 })}
      tags={listTags(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
