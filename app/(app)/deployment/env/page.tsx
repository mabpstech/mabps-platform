import { DeploymentEnvPanel } from "@/components/deployment/env-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireDeploymentWorkspace } from "@/lib/deployment/access";
import {
  listEnvVars,
  listProjects,
  toPublicEnvVar,
} from "@/lib/deployment/repository";

export default async function DeploymentEnvPage() {
  const { workspace, role } = await requireDeploymentWorkspace(
    "/deployment/env",
  );
  return (
    <DeploymentEnvPanel
      envVars={listEnvVars(workspace.id).map(toPublicEnvVar)}
      projects={listProjects(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
