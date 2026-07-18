import { SourcesManager } from "@/components/knowledge/sources-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireKnowledgeWorkspace } from "@/lib/knowledge/access";
import { listSources } from "@/lib/knowledge/repository";

export default async function KnowledgeSourcesPage() {
  const { workspace, role } = await requireKnowledgeWorkspace(
    "/knowledge/sources",
  );
  return (
    <SourcesManager
      sources={listSources(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
