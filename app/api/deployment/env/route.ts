import { NextResponse } from "next/server";
import {
  requireDeploymentManagerApi,
  requireDeploymentMemberApi,
} from "@/lib/deployment/access";
import {
  deploymentErrorResponse,
  parseEnvTarget,
} from "@/lib/deployment/http";
import {
  isValidEnvKey,
  normalizeEnvKey,
} from "@/lib/deployment/defaults";
import {
  createDeploymentLog,
  createMonitorEvent,
  listEnvVars,
  toPublicEnvVar,
  upsertEnvVar,
} from "@/lib/deployment/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const vars = listEnvVars(workspace.id, projectId).map(toPublicEnvVar);
    return NextResponse.json({ envVars: vars });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.projectId !== "string" || !body.projectId) {
      return NextResponse.json(
        { error: "projectId is required." },
        { status: 400 },
      );
    }
    if (typeof body.key !== "string" || !body.key.trim()) {
      return NextResponse.json({ error: "key is required." }, { status: 400 });
    }
    if (typeof body.value !== "string") {
      return NextResponse.json(
        { error: "value is required." },
        { status: 400 },
      );
    }

    const key = normalizeEnvKey(body.key);
    if (!isValidEnvKey(key)) {
      return NextResponse.json(
        { error: "key must look like MY_ENV_VAR." },
        { status: 400 },
      );
    }

    const envVar = upsertEnvVar(workspace.id, {
      projectId: body.projectId,
      key,
      value: body.value,
      isSecret: body.isSecret !== false,
      target: parseEnvTarget(body.target) || undefined,
    });

    createDeploymentLog(workspace.id, {
      operation: "env.upsert",
      projectId: body.projectId,
      requestSummary: key,
      responseSummary: envVar.target,
    });

    createMonitorEvent(workspace.id, {
      type: "env_updated",
      severity: "info",
      title: "Environment variable updated",
      message: key,
      projectId: body.projectId,
    });

    return NextResponse.json(
      { envVar: toPublicEnvVar(envVar) },
      { status: 201 },
    );
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
