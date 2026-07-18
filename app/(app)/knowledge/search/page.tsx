import { SearchPanel } from "@/components/knowledge/search-panel";
import { requireKnowledgeWorkspace } from "@/lib/knowledge/access";

export default async function KnowledgeSearchPage() {
  await requireKnowledgeWorkspace("/knowledge/search");
  return <SearchPanel />;
}
