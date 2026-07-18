import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import {
  ensureWorkspaceCrm,
  getPipelineBoard,
  listPipelines,
} from "@/lib/crm/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    ensureWorkspaceCrm(workspace.id);
    const pipelineId =
      new URL(request.url).searchParams.get("pipelineId") || undefined;
    const board = getPipelineBoard(workspace.id, pipelineId);
    const pipelines = listPipelines(workspace.id);
    return NextResponse.json({ board, pipelines });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
