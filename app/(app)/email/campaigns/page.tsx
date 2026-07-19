import { EmailCampaignsPanel } from "@/components/email/campaigns-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireEmailWorkspace } from "@/lib/email-engine/access";
import { listCampaigns, listTemplates } from "@/lib/email-engine/repository";

export default async function EmailCampaignsPage() {
  const { workspace, role } = await requireEmailWorkspace("/email/campaigns");
  return (
    <EmailCampaignsPanel
      campaigns={listCampaigns(workspace.id, { limit: 200 })}
      templates={listTemplates(workspace.id, { limit: 100 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
