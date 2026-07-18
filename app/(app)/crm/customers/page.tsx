import { CustomersManager } from "@/components/crm/customers-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireCrmWorkspace } from "@/lib/crm/access";
import { listCustomers, listTags } from "@/lib/crm/repository";

export default async function CrmCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, role } = await requireCrmWorkspace("/crm/customers");
  const params = await searchParams;

  const customers = listCustomers(workspace.id, {
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    lifecycleStage:
      typeof params.lifecycleStage === "string"
        ? params.lifecycleStage
        : undefined,
    tagId: typeof params.tagId === "string" ? params.tagId : undefined,
    limit: 200,
  });

  return (
    <CustomersManager
      customers={customers}
      tags={listTags(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
