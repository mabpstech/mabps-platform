import { EmailOverview } from "@/components/email/email-overview";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireEmailWorkspace } from "@/lib/email-engine/access";
import { getEmailOverview } from "@/lib/email-engine/repository";

export default async function EmailPage() {
  const { workspace, role } = await requireEmailWorkspace("/email");
  return (
    <EmailOverview
      stats={getEmailOverview(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
