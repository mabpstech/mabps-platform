import { DeploymentHistoryPanel } from "@/components/deployment/history-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireDeploymentWorkspace } from "@/lib/deployment/access";
import { listDeployments, listProjects } from "@/lib/deployment/repository";

export default async function DeploymentHistoryPage() {
  const { workspace, role } = await requireDeploymentWorkspace(
    "/deployment/history",
  );
  return (
    <DeploymentHistoryPanel
      deployments={listDeployments(workspace.id, { limit: 50 })}
      projects={listProjects(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
