import { GuardianFindingsPanel } from "@/components/guardian/findings-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireGuardianWorkspace } from "@/lib/guardian/access";
import { listFindings } from "@/lib/guardian/repository";

export default async function GuardianFindingsPage({
  searchParams,
}: {
  searchParams: Promise<{ scanId?: string; status?: string }>;
}) {
  const { workspace, role } = await requireGuardianWorkspace(
    "/guardian/findings",
  );
  const params = await searchParams;
  return (
    <GuardianFindingsPanel
      findings={listFindings(workspace.id, {
        scanId: params.scanId,
        status: params.status,
        limit: 100,
      })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
