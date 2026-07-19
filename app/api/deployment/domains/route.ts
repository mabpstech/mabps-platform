import { NextResponse } from "next/server";
import {
  requireDeploymentManagerApi,
  requireDeploymentMemberApi,
} from "@/lib/deployment/access";
import {
  deploymentErrorResponse,
  parseDnsProvider,
} from "@/lib/deployment/http";
import { addCustomDomain } from "@/lib/deployment/engine/domains";
import { listDomains } from "@/lib/deployment/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { searchParams } = new URL(request.url);
    const domains = listDomains(workspace.id, {
      projectId: searchParams.get("projectId") || undefined,
      status: searchParams.get("status") || undefined,
    });
    return NextResponse.json({ domains });
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
    if (typeof body.hostname !== "string" || !body.hostname.trim()) {
      return NextResponse.json(
        { error: "hostname is required." },
        { status: 400 },
      );
    }

    const result = addCustomDomain({
      workspaceId: workspace.id,
      projectId: body.projectId,
      hostname: body.hostname,
      isPrimary: body.isPrimary === true,
      dnsProvider: parseDnsProvider(body.dnsProvider) || undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
