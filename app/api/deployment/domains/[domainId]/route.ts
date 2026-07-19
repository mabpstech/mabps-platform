import { NextResponse } from "next/server";
import {
  requireDeploymentManagerApi,
  requireDeploymentMemberApi,
} from "@/lib/deployment/access";
import { deploymentErrorResponse } from "@/lib/deployment/http";
import {
  getDomainVerificationInstructions,
  removeDomain,
  verifyDomain,
} from "@/lib/deployment/engine/domains";
import { getDomainById, updateDomain } from "@/lib/deployment/repository";

type Params = { params: Promise<{ domainId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    const { domainId } = await params;
    const result = getDomainVerificationInstructions(workspace.id, domainId);
    return NextResponse.json(result);
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    const { domainId } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "verify") {
      const result = await verifyDomain({
        workspaceId: workspace.id,
        domainId,
        force: body.force === true,
      });
      return NextResponse.json(result);
    }

    const existing = getDomainById(workspace.id, domainId);
    if (!existing) {
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }

    const domain = updateDomain(workspace.id, domainId, {
      isPrimary: typeof body.isPrimary === "boolean" ? body.isPrimary : undefined,
    });
    return NextResponse.json({ domain });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    const { domainId } = await params;
    removeDomain({ workspaceId: workspace.id, domainId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
