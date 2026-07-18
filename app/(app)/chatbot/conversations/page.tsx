import { ConversationsManager } from "@/components/chatbot/conversations-manager";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import { listBots, listConversations } from "@/lib/chatbot/repository";

type PageProps = {
  searchParams: Promise<{ status?: string; botId?: string; q?: string }>;
};

export default async function ChatbotConversationsPage({
  searchParams,
}: PageProps) {
  const { workspace } = await requireChatbotWorkspace("/chatbot/conversations");
  const params = await searchParams;

  return (
    <ConversationsManager
      conversations={listConversations(workspace.id, {
        status: params.status,
        botId: params.botId,
        q: params.q,
        limit: 200,
      })}
      bots={listBots(workspace.id)}
    />
  );
}
