import { GuardianLogsPanel } from "@/components/guardian/logs-panel";
import { requireGuardianWorkspace } from "@/lib/guardian/access";
import { listGuardianLogs } from "@/lib/guardian/repository";

export default async function GuardianLogsPage() {
  const { workspace } = await requireGuardianWorkspace("/guardian/logs");
  return (
    <GuardianLogsPanel logs={listGuardianLogs(workspace.id, { limit: 100 })} />
  );
}
