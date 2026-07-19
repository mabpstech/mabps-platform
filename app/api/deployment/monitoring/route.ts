import { NextResponse } from "next/server";
import { requireDeploymentMemberApi } from "@/lib/deployment/access";
import { deploymentErrorResponse } from "@/lib/deployment/http";
import { listMonitorEvents } from "@/lib/deployment/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 100;
    const events = listMonitorEvents(workspace.id, {
      projectId: searchParams.get("projectId") || undefined,
      limit:
        typeof limit === "number" && Number.isFinite(limit)
          ? Math.min(Math.max(1, Math.floor(limit)), 500)
          : 100,
    });
    return NextResponse.json({ events });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
