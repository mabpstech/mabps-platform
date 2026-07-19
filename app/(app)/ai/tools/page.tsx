import { ToolsPanel } from "@/components/ai/tools-panel";
import { requireAiWorkspace } from "@/lib/ai/access";
import { ensureWorkspaceAi } from "@/lib/ai/repository";
import { listAiTools } from "@/lib/ai/tools";

export default async function AiToolsPage() {
  const { workspace } = await requireAiWorkspace("/ai/tools");
  const settings = ensureWorkspaceAi(workspace.id);
  return (
    <ToolsPanel tools={listAiTools()} toolsEnabled={settings.toolsEnabled} />
  );
}
