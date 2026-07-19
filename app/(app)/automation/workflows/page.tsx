import { WorkflowsManager } from "@/components/automation/workflows-manager";
import { requireAutomationWorkspace } from "@/lib/automation/access";
import { listWorkflows } from "@/lib/automation/repository";

export default async function AutomationsWorkflowsPage() {
  const { workspace } = await requireAutomationWorkspace("/automation");
  const workflows = listWorkflows(workspace.id);
  return <WorkflowsManager workflows={workflows} />;
}
