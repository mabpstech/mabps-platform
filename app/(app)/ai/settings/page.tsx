import { SettingsManager } from "@/components/ai/settings-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireAiWorkspace } from "@/lib/ai/access";
import {
  ensureWorkspaceAi,
  listPrompts,
  listProviderCredentials,
} from "@/lib/ai/repository";

export default async function AiSettingsPage() {
  const { workspace, role } = await requireAiWorkspace("/ai/settings");
  const settings = ensureWorkspaceAi(workspace.id);
  return (
    <SettingsManager
      settings={settings}
      credentials={listProviderCredentials(workspace.id)}
      prompts={listPrompts(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
