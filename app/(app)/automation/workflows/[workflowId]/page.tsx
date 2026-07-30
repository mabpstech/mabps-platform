import { notFound } from "next/navigation";
import { requireAutomationWorkspace } from "@/lib/automation/access";
import { getWorkflowById } from "@/lib/automation/repository";
import { WorkflowBuilderDynamic } from "@/components/automation/workflow-builder-dynamic";

type PageProps = { params: Promise<{ workflowId: string }> };

export default async function AutomationWorkflowPage({ params }: PageProps) {
  const { workspace } = await requireAutomationWorkspace("/automation");
  const { workflowId } = await params;
  const workflow = getWorkflowById(workflowId);
  if (!workflow || workflow.workspaceId !== workspace.id) notFound();
  return <WorkflowBuilderDynamic workflow={workflow} />;
}
