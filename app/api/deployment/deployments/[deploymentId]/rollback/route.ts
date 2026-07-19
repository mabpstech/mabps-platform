import { NextResponse } from "next/server";
import { requireDeploymentManagerApi } from "@/lib/deployment/access";
import { rollbackDeployment } from "@/lib/deployment/engine/rollback";
import { deploymentErrorResponse } from "@/lib/deployment/http";

type Params = { params: Promise<{ deploymentId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { workspace, session } = await requireDeploymentManagerApi();
    const { deploymentId } = await params;
    const result = await rollbackDeployment({
      workspaceId: workspace.id,
      deploymentId,
      createdByUserId: session.user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
