import { EmailLogsPanel } from "@/components/email/logs-panel";
import { requireEmailWorkspace } from "@/lib/email-engine/access";
import { listEmailEvents, listEmailLogs } from "@/lib/email-engine/repository";

export default async function EmailLogsPage() {
  const { workspace } = await requireEmailWorkspace("/email/logs");
  return (
    <EmailLogsPanel
      logs={listEmailLogs(workspace.id, { limit: 200 })}
      events={listEmailEvents(workspace.id, { limit: 200 })}
    />
  );
}
