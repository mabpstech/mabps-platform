import { notFound } from "next/navigation";
import { RunDetail } from "@/components/automation/run-detail";
import { requireAutomationWorkspace } from "@/lib/automation/access";
import {
  getRunById,
  getWorkflowById,
  listRunLogs,
  listRunSteps,
} from "@/lib/automation/repository";

type PageProps = { params: Promise<{ runId: string }> };

export default async function AutomationRunPage({ params }: PageProps) {
  const { workspace } = await requireAutomationWorkspace("/automation");
  const { runId } = await params;
  const run = getRunById(runId);
  if (!run || run.workspaceId !== workspace.id) notFound();
  return (
    <RunDetail
      run={run}
      workflow={getWorkflowById(run.workflowId)}
      steps={listRunSteps(runId)}
      logs={listRunLogs(runId)}
    />
  );
}
