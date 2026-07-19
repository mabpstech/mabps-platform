import { DeploymentHealthPanel } from "@/components/deployment/health-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireDeploymentWorkspace } from "@/lib/deployment/access";
import {
  listHealthChecks,
  listMonitorEvents,
  listProjects,
} from "@/lib/deployment/repository";

export default async function DeploymentHealthPage() {
  const { workspace, role } = await requireDeploymentWorkspace(
    "/deployment/health",
  );
  return (
    <DeploymentHealthPanel
      checks={listHealthChecks(workspace.id, { limit: 50 })}
      events={listMonitorEvents(workspace.id, { limit: 50 })}
      projects={listProjects(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
