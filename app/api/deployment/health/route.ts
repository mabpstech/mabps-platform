import { NextResponse } from "next/server";
import {
  requireDeploymentManagerApi,
  requireDeploymentMemberApi,
} from "@/lib/deployment/access";
import {
  getRecentHealth,
  runHealthCheck,
  runWorkspaceHealthChecks,
} from "@/lib/deployment/engine/health";
import { deploymentErrorResponse } from "@/lib/deployment/http";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { searchParams } = new URL(request.url);
    const checks = getRecentHealth(
      workspace.id,
      searchParams.get("projectId") || undefined,
    );
    return NextResponse.json({ checks });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (body.all === true) {
      const checks = await runWorkspaceHealthChecks(workspace.id);
      return NextResponse.json({ checks });
    }

    if (typeof body.projectId !== "string" || !body.projectId) {
      return NextResponse.json(
        { error: "projectId is required (or set all: true)." },
        { status: 400 },
      );
    }

    const check = await runHealthCheck({
      workspaceId: workspace.id,
      projectId: body.projectId,
      url: typeof body.url === "string" ? body.url : undefined,
      domainId:
        typeof body.domainId === "string" || body.domainId === null
          ? (body.domainId as string | null)
          : undefined,
    });

    return NextResponse.json({ check }, { status: 201 });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
