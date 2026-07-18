import { KnowledgeSubnav } from "@/components/knowledge/knowledge-subnav";
import { requireKnowledgeWorkspace } from "@/lib/knowledge/access";
import { ensureKnowledgeReady } from "@/lib/knowledge/repository";

export default async function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireKnowledgeWorkspace("/knowledge");
  ensureKnowledgeReady();

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <KnowledgeSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
