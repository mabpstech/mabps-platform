import { PromptsManager } from "@/components/ai/prompts-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireAiWorkspace } from "@/lib/ai/access";
import { ensureWorkspaceAi, listPrompts } from "@/lib/ai/repository";

export default async function AiPromptsPage() {
  const { workspace, role } = await requireAiWorkspace("/ai/prompts");
  ensureWorkspaceAi(workspace.id);
  return (
    <PromptsManager
      prompts={listPrompts(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
