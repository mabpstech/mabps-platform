import { PipelineBoard } from "@/components/crm/pipeline-board";
import { requireCrmWorkspace } from "@/lib/crm/access";
import { getPipelineBoard } from "@/lib/crm/repository";

export default async function CrmPipelinePage() {
  const { workspace } = await requireCrmWorkspace("/crm/pipeline");
  const board = getPipelineBoard(workspace.id);
  return <PipelineBoard board={board} />;
}
