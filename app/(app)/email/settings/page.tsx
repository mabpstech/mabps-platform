import { EmailSettingsManager } from "@/components/email/settings-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireEmailWorkspace } from "@/lib/email-engine/access";
import {
  ensureWorkspaceEmail,
  toPublicSettings,
} from "@/lib/email-engine/repository";

export default async function EmailSettingsPage() {
  const { workspace, role } = await requireEmailWorkspace("/email/settings");
  const settings = toPublicSettings(ensureWorkspaceEmail(workspace.id));
  const webhookBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  return (
    <EmailSettingsManager
      settings={settings}
      canManage={isWorkspaceManager(role)}
      webhookBaseUrl={webhookBaseUrl}
    />
  );
}
