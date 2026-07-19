import { WhatsAppLogsPanel } from "@/components/whatsapp/logs-panel";
import { requireWhatsAppWorkspace } from "@/lib/whatsapp/access";
import { listWhatsAppLogs } from "@/lib/whatsapp/repository";

export default async function WhatsAppLogsPage() {
  const { workspace } = await requireWhatsAppWorkspace("/whatsapp/logs");
  return <WhatsAppLogsPanel logs={listWhatsAppLogs(workspace.id, { limit: 200 })} />;
}
