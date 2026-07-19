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
  ensureWorkspaceDeployment,
  toPublicSettings,
  updateDeploymentSettings,
} from "@/lib/deployment/repository";

export async function GET() {
  try {
    const { workspace } = await requireDeploymentMemberApi();
    return NextResponse.json({
      settings: toPublicSettings(ensureWorkspaceDeployment(workspace.id)),
    });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { workspace } = await requireDeploymentManagerApi();
    ensureWorkspaceDeployment(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;
    const defaultProvider = parseDeploymentProvider(body.defaultProvider);

    const settings = updateDeploymentSettings(workspace.id, {
      defaultProvider: defaultProvider || undefined,
      autoSslEnabled:
        typeof body.autoSslEnabled === "boolean"
          ? body.autoSslEnabled
          : undefined,
      autoDnsVerifyEnabled:
        typeof body.autoDnsVerifyEnabled === "boolean"
          ? body.autoDnsVerifyEnabled
          : undefined,
      healthChecksEnabled:
        typeof body.healthChecksEnabled === "boolean"
          ? body.healthChecksEnabled
          : undefined,
      monitoringEnabled:
        typeof body.monitoringEnabled === "boolean"
          ? body.monitoringEnabled
          : undefined,
      publishOnDomainVerify:
        typeof body.publishOnDomainVerify === "boolean"
          ? body.publishOnDomainVerify
          : undefined,
      healthCheckIntervalSec:
        typeof body.healthCheckIntervalSec === "number"
          ? body.healthCheckIntervalSec
          : undefined,
      healthCheckPath:
        typeof body.healthCheckPath === "string"
          ? body.healthCheckPath
          : undefined,
      healthCheckTimeoutMs:
        typeof body.healthCheckTimeoutMs === "number"
          ? body.healthCheckTimeoutMs
          : undefined,
      retentionDeployments:
        typeof body.retentionDeployments === "number"
          ? body.retentionDeployments
          : undefined,
      vercelTeamId:
        typeof body.vercelTeamId === "string" || body.vercelTeamId === null
          ? (body.vercelTeamId as string | null)
          : undefined,
      vercelToken:
        typeof body.vercelToken === "string" ? body.vercelToken : undefined,
      clearVercelToken: body.clearVercelToken === true,
      cloudflareAccountId:
        typeof body.cloudflareAccountId === "string" ||
        body.cloudflareAccountId === null
          ? (body.cloudflareAccountId as string | null)
          : undefined,
      cloudflareApiToken:
        typeof body.cloudflareApiToken === "string"
          ? body.cloudflareApiToken
          : undefined,
      clearCloudflareToken: body.clearCloudflareToken === true,
      cloudflareZoneId:
        typeof body.cloudflareZoneId === "string" ||
        body.cloudflareZoneId === null
          ? (body.cloudflareZoneId as string | null)
          : undefined,
      webhookUrl:
        typeof body.webhookUrl === "string" || body.webhookUrl === null
          ? (body.webhookUrl as string | null)
          : undefined,
    });

    return NextResponse.json({ settings: toPublicSettings(settings) });
  } catch (error) {
    return deploymentErrorResponse(error);
  }
}
