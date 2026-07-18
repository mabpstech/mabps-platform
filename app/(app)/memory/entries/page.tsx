import { EntriesManager } from "@/components/memory/entries-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireMemoryWorkspace } from "@/lib/memory/access";
import { listMemories } from "@/lib/memory/repository";

export default async function MemoryEntriesPage() {
  const { workspace, role } = await requireMemoryWorkspace("/memory/entries");
  return (
    <EntriesManager
      memories={listMemories(workspace.id, { limit: 200 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
