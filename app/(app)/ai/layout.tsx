import { AiSubnav } from "@/components/ai/ai-subnav";
import { requireAiWorkspace } from "@/lib/ai/access";
import { ensureWorkspaceAi } from "@/lib/ai/repository";

export default async function AiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireAiWorkspace("/ai");
  ensureWorkspaceAi(workspace.id);

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <AiSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
