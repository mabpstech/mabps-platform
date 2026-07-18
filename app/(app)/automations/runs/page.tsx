import { RunsManager } from "@/components/automation/runs-manager";
import { requireAutomationWorkspace } from "@/lib/automation/access";
import { listRuns, listWorkflows } from "@/lib/automation/repository";

export default async function AutomationsRunsPage() {
  const { workspace } = await requireAutomationWorkspace("/automations");
  const runs = listRuns(workspace.id, { limit: 100 });
  const workflows = listWorkflows(workspace.id);
  return <RunsManager runs={runs} workflows={workflows} />;
}
