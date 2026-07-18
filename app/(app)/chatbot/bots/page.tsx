import { BotsManager } from "@/components/chatbot/bots-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import { listBots } from "@/lib/chatbot/repository";

export default async function ChatbotBotsPage() {
  const { workspace, role } = await requireChatbotWorkspace("/chatbot/bots");
  return (
    <BotsManager
      bots={listBots(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
