import { GuardianScansPanel } from "@/components/guardian/scans-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireGuardianWorkspace } from "@/lib/guardian/access";
import { listScans } from "@/lib/guardian/repository";

export default async function GuardianScansPage() {
  const { workspace, role } = await requireGuardianWorkspace("/guardian/scans");
  return (
    <GuardianScansPanel
      scans={listScans(workspace.id, { limit: 100 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
