import { TagsManager } from "@/components/crm/tags-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireCrmWorkspace } from "@/lib/crm/access";
import { listTags } from "@/lib/crm/repository";

export default async function CrmTagsPage() {
  const { workspace, role } = await requireCrmWorkspace("/crm/tags");
  return (
    <TagsManager
      tags={listTags(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
