import { GuardianRepairsPanel } from "@/components/guardian/repairs-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireGuardianWorkspace } from "@/lib/guardian/access";
import { listRepairs } from "@/lib/guardian/repository";

export default async function GuardianRepairsPage() {
  const { workspace, role } = await requireGuardianWorkspace(
    "/guardian/repairs",
  );
  return (
    <GuardianRepairsPanel
      repairs={listRepairs(workspace.id, { limit: 100 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
