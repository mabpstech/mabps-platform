import { GuardianHealthPanel } from "@/components/guardian/health-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireGuardianWorkspace } from "@/lib/guardian/access";
import {
  getGuardianOverview,
  listCheckResults,
  listMonitorEvents,
  listScans,
} from "@/lib/guardian/repository";

export default async function GuardianHealthPage() {
  const { workspace, role } = await requireGuardianWorkspace(
    "/guardian/health",
  );
  const lastScan = listScans(workspace.id, { limit: 1 })[0] || null;
  return (
    <GuardianHealthPanel
      overview={getGuardianOverview(workspace.id)}
      lastScan={lastScan}
      checks={
        lastScan
          ? listCheckResults(workspace.id, { scanId: lastScan.id, limit: 100 })
          : []
      }
      events={listMonitorEvents(workspace.id, { limit: 50 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
