import { DeploymentProjectsPanel } from "@/components/deployment/projects-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireDeploymentWorkspace } from "@/lib/deployment/access";
import { listProjects } from "@/lib/deployment/repository";

export default async function DeploymentProjectsPage() {
  const { workspace, role } = await requireDeploymentWorkspace(
    "/deployment/projects",
  );
  return (
    <DeploymentProjectsPanel
      projects={listProjects(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
