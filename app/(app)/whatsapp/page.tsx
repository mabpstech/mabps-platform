import { WhatsAppOverview } from "@/components/whatsapp/whatsapp-overview";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWhatsAppWorkspace } from "@/lib/whatsapp/access";
import { getWhatsAppOverview } from "@/lib/whatsapp/repository";

export default async function WhatsAppPage() {
  const { workspace, role } = await requireWhatsAppWorkspace("/whatsapp");
  return (
    <WhatsAppOverview
      stats={getWhatsAppOverview(workspace.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
