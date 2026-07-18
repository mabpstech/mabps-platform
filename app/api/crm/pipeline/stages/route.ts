import { NextResponse } from "next/server";
import { requireCrmManagerApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { createPipelineStage } from "@/lib/crm/repository";

export async function POST(request: Request) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.pipelineId !== "string" || !body.pipelineId) {
      return NextResponse.json(
        { error: "pipelineId is required." },
        { status: 400 },
      );
    }
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Stage name is required." },
        { status: 400 },
      );
    }

    const stage = createPipelineStage({
      workspaceId: workspace.id,
      pipelineId: body.pipelineId,
      name: body.name,
      color: typeof body.color === "string" ? body.color : undefined,
      probability:
        typeof body.probability === "number" ? body.probability : undefined,
      isWon: body.isWon === true,
      isLost: body.isLost === true,
    });

    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
