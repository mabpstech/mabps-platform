import { ProvidersManager } from "@/components/chatbot/providers-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import { listProviderCredentials } from "@/lib/chatbot/repository";

export default async function ChatbotProvidersPage() {
  const { workspace, role } = await requireChatbotWorkspace(
    "/chatbot/providers",
  );
  return (
    <ProvidersManager
      credentials={listProviderCredentials(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
