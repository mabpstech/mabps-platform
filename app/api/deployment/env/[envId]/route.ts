import { NextResponse } from "next/server";
import { requireDeploymentManagerApi } from "@/lib/deployment/access";
import { deploymentErrorResponse } from "@/lib/deployment/http";
import {
  createDeploymentLog,
  deleteEnvVar,
  getEnvVarById,
  toPublicEnvVar,
  upsertEnvVar,
} from "@/lib/deployment/repository";

type Params = { params: Promise<{ envId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    const { envId } = await params;
    const existing = getEnvVarById(workspace.id, envId);
    if (!existing) {
      return NextResponse.json(
        { error: "Environment variable not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const envVar = upsertEnvVar(workspace.id, {
      projectId: existing.projectId,
      key: existing.key,
      value:
        typeof body.value === "string" ? body.value : existing.value,
      isSecret:
        typeof body.isSecret === "boolean" ? body.isSecret : existing.isSecret,
      target: existing.target,
    });

    createDeploymentLog(workspace.id, {
      operation: "env.update",
      projectId: existing.projectId,
      requestSummary: existing.key,
    });

    return NextResponse.json({ envVar: toPublicEnvVar(envVar) });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    const { envId } = await params;
    const existing = getEnvVarById(workspace.id, envId);
    if (!existing) {
      return NextResponse.json(
        { error: "Environment variable not found." },
        { status: 404 },
      );
    }
    deleteEnvVar(workspace.id, envId);
    createDeploymentLog(workspace.id, {
      operation: "env.delete",
      projectId: existing.projectId,
      requestSummary: existing.key,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
