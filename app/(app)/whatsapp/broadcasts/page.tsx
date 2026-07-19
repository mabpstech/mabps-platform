import { BroadcastsPanel } from "@/components/whatsapp/broadcasts-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWhatsAppWorkspace } from "@/lib/whatsapp/access";
import { listBroadcasts } from "@/lib/whatsapp/repository";

export default async function WhatsAppBroadcastsPage() {
  const { workspace, role } = await requireWhatsAppWorkspace(
    "/whatsapp/broadcasts",
  );
  return (
    <BroadcastsPanel
      broadcasts={listBroadcasts(workspace.id, { limit: 100 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
