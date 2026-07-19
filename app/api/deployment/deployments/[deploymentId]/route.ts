import { NextResponse } from "next/server";
import { requireDeploymentMemberApi } from "@/lib/deployment/access";
import { deploymentErrorResponse } from "@/lib/deployment/http";
import {
  getDeploymentById,
  listBuildLogs,
} from "@/lib/deployment/repository";

type Params = { params: Promise<{ deploymentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { deploymentId } = await params;
    const deployment = getDeploymentById(workspace.id, deploymentId);
    if (!deployment) {
      return NextResponse.json(
        { error: "Deployment not found." },
        { status: 404 },
      );
    }
    const logs = listBuildLogs(workspace.id, deploymentId);
    return NextResponse.json({ deployment, logs });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
