import { NextResponse } from "next/server";
import { requireDeploymentMemberApi } from "@/lib/deployment/access";
import { deploymentErrorResponse } from "@/lib/deployment/http";
import {
  listDeploymentLogs,
  listMonitorEvents,
} from "@/lib/deployment/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 100;
    const safeLimit =
      typeof limit === "number" && Number.isFinite(limit)
        ? Math.min(Math.max(1, Math.floor(limit)), 500)
        : 100;

    return NextResponse.json({
      logs: listDeploymentLogs(workspace.id, { limit: safeLimit }),
      events: listMonitorEvents(workspace.id, { limit: safeLimit }),
    });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
