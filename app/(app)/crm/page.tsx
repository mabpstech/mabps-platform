import { CrmOverview } from "@/components/crm/crm-overview";
import { requireCrmWorkspace } from "@/lib/crm/access";
import { getCrmOverview } from "@/lib/crm/repository";

export default async function CrmPage() {
  const { workspace } = await requireCrmWorkspace("/crm");
  const stats = getCrmOverview(workspace.id);
  return <CrmOverview stats={stats} />;
}
