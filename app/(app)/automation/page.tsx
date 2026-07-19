import { AutomationOverview } from "@/components/automation/automation-overview";
import { requireAutomationWorkspace } from "@/lib/automation/access";
import { getAutomationOverview } from "@/lib/automation/repository";

export default async function AutomationsPage() {
  const { workspace } = await requireAutomationWorkspace("/automation");
  const stats = getAutomationOverview(workspace.id);
  return <AutomationOverview stats={stats} />;
}
