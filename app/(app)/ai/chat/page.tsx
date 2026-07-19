import { ChatPanel } from "@/components/ai/chat-panel";
import { requireAiWorkspace } from "@/lib/ai/access";
import {
  ensureWorkspaceAi,
  getConversationById,
  listConversations,
  listMessages,
} from "@/lib/ai/repository";

export default async function AiChatPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const { workspace, session } = await requireAiWorkspace("/ai/chat");
  const settings = ensureWorkspaceAi(workspace.id);
  const params = await searchParams;
  const conversations = listConversations(workspace.id, {
    userId: session.user.id,
    limit: 50,
  });

  const selected =
    params.conversationId
      ? getConversationById(params.conversationId)
      : conversations[0] || null;

  const conversation =
    selected &&
    selected.workspaceId === workspace.id &&
    selected.userId === session.user.id
      ? selected
      : null;

  return (
    <ChatPanel
      conversations={conversations}
      initialConversation={conversation}
      initialMessages={conversation ? listMessages(conversation.id) : []}
      settings={settings}
    />
  );
}
