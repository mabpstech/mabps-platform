import { notFound } from "next/navigation";
import { WorkflowBuilder } from "@/components/automation/workflow-builder";
import { requireAutomationWorkspace } from "@/lib/automation/access";
import { getWorkflowById } from "@/lib/automation/repository";

type PageProps = { params: Promise<{ workflowId: string }> };

export default async function AutomationWorkflowPage({ params }: PageProps) {
  const { workspace } = await requireAutomationWorkspace("/automations");
  const { workflowId } = await params;
  const workflow = getWorkflowById(workflowId);
  if (!workflow || workflow.workspaceId !== workspace.id) notFound();
  return <WorkflowBuilder workflow={workflow} />;
}
