import { LogsPanel } from "@/components/ai/logs-panel";
import { requireAiWorkspace } from "@/lib/ai/access";
import { ensureWorkspaceAi, listAiLogs } from "@/lib/ai/repository";

export default async function AiLogsPage() {
  const { workspace } = await requireAiWorkspace("/ai/logs");
  ensureWorkspaceAi(workspace.id);
  return <LogsPanel logs={listAiLogs(workspace.id, { limit: 200 })} />;
}
