import { NextResponse } from "next/server";
import {
  requireDeploymentManagerApi,
  requireDeploymentMemberApi,
} from "@/lib/deployment/access";
import {
  deploymentErrorResponse,
  parseDeploymentListFilters,
  parseDeploymentProvider,
} from "@/lib/deployment/http";
import {
  createProject,
  ensureWorkspaceDeployment,
  listProjects,
} from "@/lib/deployment/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { searchParams } = new URL(request.url);
    const projects = listProjects(
      workspace.id,
      parseDeploymentListFilters(searchParams),
    );
    return NextResponse.json({ projects });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireDeploymentManagerApi();
    ensureWorkspaceDeployment(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "name is required." },
        { status: 400 },
      );
    }

    const provider = parseDeploymentProvider(body.provider);
    const project = createProject(workspace.id, {
      name: body.name,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      provider: provider || undefined,
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
      createdByUserId: session.user.id,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
