import { WhatsAppSubnav } from "@/components/whatsapp/whatsapp-subnav";
import { requireWhatsAppWorkspace } from "@/lib/whatsapp/access";
import { ensureWorkspaceWhatsApp } from "@/lib/whatsapp/repository";

export default async function WhatsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireWhatsAppWorkspace("/whatsapp");
  ensureWorkspaceWhatsApp(workspace.id);

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <WhatsAppSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
