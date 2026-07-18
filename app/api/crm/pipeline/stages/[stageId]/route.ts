import { NextResponse } from "next/server";
import { requireCrmManagerApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { updatePipelineStage } from "@/lib/crm/repository";

type RouteContext = { params: Promise<{ stageId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { stageId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const stage = updatePipelineStage(stageId, workspace.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
      probability:
        typeof body.probability === "number" ? body.probability : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      isWon: typeof body.isWon === "boolean" ? body.isWon : undefined,
      isLost: typeof body.isLost === "boolean" ? body.isLost : undefined,
    });
    return NextResponse.json({ stage });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
