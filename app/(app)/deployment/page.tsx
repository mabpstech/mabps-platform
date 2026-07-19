import { DeploymentOverview } from "@/components/deployment/deployment-overview";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireDeploymentWorkspace } from "@/lib/deployment/access";
import { getDeploymentOverview } from "@/lib/deployment/repository";

export default async function DeploymentPage() {
  const { workspace, role } = await requireDeploymentWorkspace("/deployment");
  return (
    <DeploymentOverview
      stats={getDeploymentOverview(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
