import { ChooseCreatePath } from "@/components/website/create/choose-path";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";

export default async function CreateWebsitePage() {
  const { role } = await requireWebsiteWorkspace("/website/new");

  return <ChooseCreatePath canManage={isWorkspaceManager(role)} />;
}
