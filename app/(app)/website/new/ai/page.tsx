import { AiCreateExperience } from "@/components/website/create/ai-create-experience";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";

export default async function CreateWebsiteWithAiPage() {
  const { role } = await requireWebsiteWorkspace("/website/new/ai");

  return <AiCreateExperience canManage={isWorkspaceManager(role)} />;
}
