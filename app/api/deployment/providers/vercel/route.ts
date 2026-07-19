import { NextResponse } from "next/server";
import { requireDeploymentManagerApi } from "@/lib/deployment/access";
import { testVercelConnection } from "@/lib/deployment/engine/vercel";
import { deploymentErrorResponse } from "@/lib/deployment/http";
import {
  createDeploymentLog,
  ensureWorkspaceDeployment,
} from "@/lib/deployment/repository";

export async function POST() {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    const settings = ensureWorkspaceDeployment(workspace.id);
    const result = await testVercelConnection(settings);

    createDeploymentLog(workspace.id, {
      operation: "provider.vercel.test",
      status: result.ok ? "success" : "error",
      responseSummary: result.message,
      errorMessage: result.ok ? null : result.message,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
