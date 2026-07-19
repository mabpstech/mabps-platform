import { WhatsAppSettingsManager } from "@/components/whatsapp/settings-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { listBots } from "@/lib/chatbot/repository";
import { requireWhatsAppWorkspace } from "@/lib/whatsapp/access";
import {
  ensureWorkspaceWhatsApp,
  toPublicSettings,
} from "@/lib/whatsapp/repository";

export default async function WhatsAppSettingsPage() {
  const { workspace, role } = await requireWhatsAppWorkspace(
    "/whatsapp/settings",
  );
  const settings = toPublicSettings(ensureWorkspaceWhatsApp(workspace.id));
  const bots = listBots(workspace.id).map((bot) => ({
    id: bot.id,
    name: bot.name,
  }));
  const webhookBaseUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  return (
    <WhatsAppSettingsManager
      settings={settings}
      bots={bots}
      canManage={isWorkspaceManager(role)}
      webhookBaseUrl={webhookBaseUrl.replace(/\/$/, "")}
    />
  );
}
