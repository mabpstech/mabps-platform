import { NextResponse } from "next/server";
import { requireDeploymentMemberApi } from "@/lib/deployment/access";
import { deploymentErrorResponse } from "@/lib/deployment/http";
import { getDeploymentOverview } from "@/lib/deployment/repository";

export async function GET() {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    return NextResponse.json({
      overview: getDeploymentOverview(workspace.id),
    });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
