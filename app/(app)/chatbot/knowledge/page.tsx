import { KnowledgeManager } from "@/components/chatbot/knowledge-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import { listBots, listKnowledgeSources } from "@/lib/chatbot/repository";

type PageProps = {
  searchParams: Promise<{ botId?: string }>;
};

export default async function ChatbotKnowledgePage({ searchParams }: PageProps) {
  const { workspace, role } = await requireChatbotWorkspace(
    "/chatbot/knowledge",
  );
  const params = await searchParams;
  const bots = listBots(workspace.id);
  const botId = params.botId || bots[0]?.id;

  return (
    <KnowledgeManager
      bots={bots}
      sources={listKnowledgeSources(workspace.id, botId)}
      canManage={isWorkspaceManager(role)}
      initialBotId={botId}
    />
  );
}
