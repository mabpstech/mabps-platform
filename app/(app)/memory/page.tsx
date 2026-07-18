import { MemoryOverview } from "@/components/memory/memory-overview";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireMemoryWorkspace } from "@/lib/memory/access";
import { getMemoryOverview } from "@/lib/memory/repository";

export default async function MemoryPage() {
  const { workspace, role } = await requireMemoryWorkspace("/memory");
  return (
    <MemoryOverview
      stats={getMemoryOverview(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
