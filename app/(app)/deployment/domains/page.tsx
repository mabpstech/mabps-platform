import { DeploymentDomainsPanel } from "@/components/deployment/domains-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireDeploymentWorkspace } from "@/lib/deployment/access";
import { listDomains, listProjects } from "@/lib/deployment/repository";

export default async function DeploymentDomainsPage() {
  const { workspace, role } = await requireDeploymentWorkspace(
    "/deployment/domains",
  );
  return (
    <DeploymentDomainsPanel
      domains={listDomains(workspace.id)}
      projects={listProjects(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
