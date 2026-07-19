import { GuardianSettingsManager } from "@/components/guardian/settings-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireGuardianWorkspace } from "@/lib/guardian/access";
import {
  ensureWorkspaceGuardian,
  toPublicSettings,
} from "@/lib/guardian/repository";

export default async function GuardianSettingsPage() {
  const { workspace, role } = await requireGuardianWorkspace(
    "/guardian/settings",
  );
  return (
    <GuardianSettingsManager
      settings={toPublicSettings(ensureWorkspaceGuardian(workspace.id))}
      canManage={isWorkspaceManager(role)}
    />
  );
}
