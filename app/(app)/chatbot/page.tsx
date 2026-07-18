import { ChatbotOverview } from "@/components/chatbot/chatbot-overview";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import { getChatbotOverview } from "@/lib/chatbot/repository";

export default async function ChatbotPage() {
  const { workspace } = await requireChatbotWorkspace("/chatbot");
  const stats = getChatbotOverview(workspace.id);
  return <ChatbotOverview stats={stats} />;
}
