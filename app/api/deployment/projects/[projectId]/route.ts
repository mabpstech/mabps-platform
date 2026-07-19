import { NextResponse } from "next/server";
import {
  requireDeploymentManagerApi,
  requireDeploymentMemberApi,
} from "@/lib/deployment/access";
import {
  deploymentErrorResponse,
  parseDeploymentProvider,
} from "@/lib/deployment/http";
import {
  deleteProject,
  getProjectById,
  updateProject,
} from "@/lib/deployment/repository";
import { DEPLOYMENT_PROJECT_STATUSES } from "@/lib/deployment/types";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { projectId } = await params;
    const project = getProjectById(workspace.id, projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    const { projectId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const provider = parseDeploymentProvider(body.provider);
    const status =
      typeof body.status === "string" &&
      DEPLOYMENT_PROJECT_STATUSES.includes(
        body.status as (typeof DEPLOYMENT_PROJECT_STATUSES)[number],
      )
        ? (body.status as (typeof DEPLOYMENT_PROJECT_STATUSES)[number])
        : undefined;

    const project = updateProject(workspace.id, projectId, {
      name: typeof body.name === "string" ? body.name : undefined,
      provider: provider || undefined,
      status,
      siteId:
        typeof body.siteId === "string" || body.siteId === null
          ? (body.siteId as string | null)
          : undefined,
      productionBranch:
        typeof body.productionBranch === "string"
          ? body.productionBranch
          : undefined,
      framework:
        typeof body.framework === "string" ? body.framework : undefined,
      rootDirectory:
        typeof body.rootDirectory === "string" ? body.rootDirectory : undefined,
      buildCommand:
        typeof body.buildCommand === "string" || body.buildCommand === null
          ? (body.buildCommand as string | null)
          : undefined,
      outputDirectory:
        typeof body.outputDirectory === "string" ||
        body.outputDirectory === null
          ? (body.outputDirectory as string | null)
          : undefined,
      vercelProjectId:
        typeof body.vercelProjectId === "string" ||
        body.vercelProjectId === null
          ? (body.vercelProjectId as string | null)
          : undefined,
      cloudflareProjectName:
        typeof body.cloudflareProjectName === "string" ||
        body.cloudflareProjectName === null
          ? (body.cloudflareProjectName as string | null)
          : undefined,
    });

    return NextResponse.json({ project });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    const { projectId } = await params;
    deleteProject(workspace.id, projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
