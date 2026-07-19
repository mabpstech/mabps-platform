import { NextResponse } from "next/server";
import {
  requireDeploymentManagerApi,
  requireDeploymentMemberApi,
} from "@/lib/deployment/access";
import { runPublishPipeline } from "@/lib/deployment/engine/publish";
import {
  deploymentErrorResponse,
  parseDeploymentEnvironment,
  parseDeploymentListFilters,
} from "@/lib/deployment/http";
import { listDeployments } from "@/lib/deployment/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { searchParams } = new URL(request.url);
    const deployments = listDeployments(
      workspace.id,
      parseDeploymentListFilters(searchParams),
    );
    return NextResponse.json({ deployments });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireDeploymentManagerApi();
    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.projectId !== "string" || !body.projectId) {
      return NextResponse.json(
        { error: "projectId is required." },
        { status: 400 },
      );
    }

    const result = await runPublishPipeline({
      workspaceId: workspace.id,
      projectId: body.projectId,
      environment: parseDeploymentEnvironment(body.environment) || undefined,
      commitMessage:
        typeof body.commitMessage === "string" ? body.commitMessage : undefined,
      commitSha:
        typeof body.commitSha === "string" ? body.commitSha : undefined,
      branch: typeof body.branch === "string" ? body.branch : undefined,
      trigger: "api",
      createdByUserId: session.user.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
