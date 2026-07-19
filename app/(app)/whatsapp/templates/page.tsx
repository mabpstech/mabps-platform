import { TemplatesPanel } from "@/components/whatsapp/templates-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWhatsAppWorkspace } from "@/lib/whatsapp/access";
import { listTemplates } from "@/lib/whatsapp/repository";

export default async function WhatsAppTemplatesPage() {
  const { workspace, role } = await requireWhatsAppWorkspace(
    "/whatsapp/templates",
  );
  return (
    <TemplatesPanel
      templates={listTemplates(workspace.id, { limit: 200 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
