import { GuardianOverview } from "@/components/guardian/guardian-overview";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireGuardianWorkspace } from "@/lib/guardian/access";
import { getGuardianOverview } from "@/lib/guardian/repository";

export default async function GuardianPage() {
  const { workspace, role } = await requireGuardianWorkspace("/guardian");
  return (
    <GuardianOverview
      stats={getGuardianOverview(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
