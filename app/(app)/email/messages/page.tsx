import { EmailMessagesPanel } from "@/components/email/messages-panel";
import { requireEmailWorkspace } from "@/lib/email-engine/access";
import { listMessages, listTemplates } from "@/lib/email-engine/repository";

export default async function EmailMessagesPage() {
  const { workspace } = await requireEmailWorkspace("/email/messages");
  return (
    <EmailMessagesPanel
      messages={listMessages(workspace.id, { limit: 200 })}
      templates={listTemplates(workspace.id, { limit: 100 })}
    />
  );
}
