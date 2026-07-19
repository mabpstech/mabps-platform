import { DeploymentSettingsManager } from "@/components/deployment/settings-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireDeploymentWorkspace } from "@/lib/deployment/access";
import {
  ensureWorkspaceDeployment,
  toPublicSettings,
} from "@/lib/deployment/repository";

export default async function DeploymentSettingsPage() {
  const { workspace, role } = await requireDeploymentWorkspace(
    "/deployment/settings",
  );
  return (
    <DeploymentSettingsManager
      settings={toPublicSettings(ensureWorkspaceDeployment(workspace.id))}
      canManage={isWorkspaceManager(role)}
    />
  );
}
