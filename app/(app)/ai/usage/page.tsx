import { UsagePanel } from "@/components/ai/usage-panel";
import { requireAiWorkspace } from "@/lib/ai/access";
import {
  ensureWorkspaceAi,
  getAiUsageSummary,
} from "@/lib/ai/repository";

export default async function AiUsagePage() {
  const { workspace } = await requireAiWorkspace("/ai/usage");
  ensureWorkspaceAi(workspace.id);
  return <UsagePanel usage={getAiUsageSummary(workspace.id)} />;
}
