import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { requireAutomationWorkspace } from "@/lib/automation/access";
import { getWorkflowById } from "@/lib/automation/repository";

const WorkflowBuilder = dynamic(
  () =>
    import("@/components/automation/workflow-builder").then(
      (mod) => mod.WorkflowBuilder,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading workflow builder…
      </div>
    ),
  },
);

type PageProps = { params: Promise<{ workflowId: string }> };

export default async function AutomationWorkflowPage({ params }: PageProps) {
  const { workspace } = await requireAutomationWorkspace("/automation");
  const { workflowId } = await params;
  const workflow = getWorkflowById(workflowId);
  if (!workflow || workflow.workspaceId !== workspace.id) notFound();
  return <WorkflowBuilder workflow={workflow} />;
}
