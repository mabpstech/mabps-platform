import { AiOverview } from "@/components/ai/ai-overview";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireAiWorkspace } from "@/lib/ai/access";
import { getAiOverview } from "@/lib/ai/repository";

export default async function AiPage() {
  const { workspace, role } = await requireAiWorkspace("/ai");
  return (
    <AiOverview
      stats={getAiOverview(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
