import { GuardianTroubleshootPanel } from "@/components/guardian/troubleshoot-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireGuardianWorkspace } from "@/lib/guardian/access";
import { listFindings } from "@/lib/guardian/repository";

export default async function GuardianTroubleshootPage() {
  const { workspace, role } = await requireGuardianWorkspace(
    "/guardian/troubleshoot",
  );
  return (
    <GuardianTroubleshootPanel
      findings={listFindings(workspace.id, {
        status: "open",
        limit: 50,
      })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
