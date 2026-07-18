import { MemorySearchPanel } from "@/components/memory/search-panel";
import { requireMemoryWorkspace } from "@/lib/memory/access";

export default async function MemorySearchPage() {
  await requireMemoryWorkspace("/memory/search");
  return <MemorySearchPanel />;
}
