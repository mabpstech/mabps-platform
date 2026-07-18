import { notFound } from "next/navigation";
import { ConversationDetail } from "@/components/chatbot/conversation-detail";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import {
  getBotById,
  getConversationById,
  getOpenHandoff,
  listMessages,
} from "@/lib/chatbot/repository";

type PageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function ChatbotConversationPage({ params }: PageProps) {
  const { workspace } = await requireChatbotWorkspace("/chatbot/conversations");
  const { conversationId } = await params;
  const conversation = getConversationById(conversationId);
  if (!conversation || conversation.workspaceId !== workspace.id) {
    notFound();
  }

  return (
    <ConversationDetail
      conversation={conversation}
      bot={getBotById(conversation.botId)}
      messages={listMessages(conversation.id)}
      handoff={getOpenHandoff(conversation.id)}
    />
  );
}
