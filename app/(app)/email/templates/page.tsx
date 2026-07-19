import { EmailTemplatesPanel } from "@/components/email/templates-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireEmailWorkspace } from "@/lib/email-engine/access";
import { listTemplates } from "@/lib/email-engine/repository";

export default async function EmailTemplatesPage() {
  const { workspace, role } = await requireEmailWorkspace("/email/templates");
  return (
    <EmailTemplatesPanel
      templates={listTemplates(workspace.id, { limit: 200 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
