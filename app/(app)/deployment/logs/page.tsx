import { DeploymentLogsPanel } from "@/components/deployment/logs-panel";
import { requireDeploymentWorkspace } from "@/lib/deployment/access";
import {
  listDeploymentLogs,
  listMonitorEvents,
} from "@/lib/deployment/repository";

export default async function DeploymentLogsPage() {
  const { workspace } = await requireDeploymentWorkspace("/deployment/logs");
  return (
    <DeploymentLogsPanel
      logs={listDeploymentLogs(workspace.id, { limit: 100 })}
      events={listMonitorEvents(workspace.id, { limit: 100 })}
    />
  );
}
