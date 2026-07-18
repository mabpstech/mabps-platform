import { ChatbotSubnav } from "@/components/chatbot/chatbot-subnav";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import { ensureWorkspaceChatbot } from "@/lib/chatbot/repository";

export default async function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireChatbotWorkspace("/chatbot");
  ensureWorkspaceChatbot(workspace.id);

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <ChatbotSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
