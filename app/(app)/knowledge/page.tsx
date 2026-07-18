import { KnowledgeOverview } from "@/components/knowledge/knowledge-overview";
import { requireKnowledgeWorkspace } from "@/lib/knowledge/access";
import { getKnowledgeOverview } from "@/lib/knowledge/repository";

export default async function KnowledgePage() {
  const { workspace } = await requireKnowledgeWorkspace("/knowledge");
  return <KnowledgeOverview stats={getKnowledgeOverview(workspace.id)} />;
}
