import { NextResponse } from "next/server";
import {
  requireEmailManagerApi,
  requireEmailMemberApi,
} from "@/lib/email-engine/access";
import { emailErrorResponse, parseEmailProvider } from "@/lib/email-engine/http";
import {
  ensureWorkspaceEmail,
  toPublicSettings,
  updateEmailSettings,
} from "@/lib/email-engine/repository";

export async function GET() {
  try {
    const { workspace } = await requireEmailMemberApi();
    return NextResponse.json({
      settings: toPublicSettings(ensureWorkspaceEmail(workspace.id)),
    });
  } catch (error) {
    return emailErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { workspace } = await requireEmailManagerApi();
    ensureWorkspaceEmail(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;
    const provider = parseEmailProvider(body.provider);

    const settings = updateEmailSettings(workspace.id, {
      provider: provider || undefined,
      fromEmail:
        typeof body.fromEmail === "string" || body.fromEmail === null
          ? (body.fromEmail as string | null)
          : undefined,
      fromName:
        typeof body.fromName === "string" || body.fromName === null
          ? (body.fromName as string | null)
          : undefined,
      replyTo:
        typeof body.replyTo === "string" || body.replyTo === null
          ? (body.replyTo as string | null)
          : undefined,
      smtpHost:
        typeof body.smtpHost === "string" || body.smtpHost === null
          ? (body.smtpHost as string | null)
          : undefined,
      smtpPort:
        typeof body.smtpPort === "number"
          ? body.smtpPort
          : body.smtpPort === null
            ? null
            : typeof body.smtpPort === "string" && body.smtpPort.trim()
              ? Number(body.smtpPort)
              : undefined,
      smtpSecure:
        typeof body.smtpSecure === "boolean" ? body.smtpSecure : undefined,
      smtpUser:
        typeof body.smtpUser === "string" || body.smtpUser === null
          ? (body.smtpUser as string | null)
          : undefined,
      smtpPassword:
        typeof body.smtpPassword === "string" && body.smtpPassword.trim()
          ? body.smtpPassword
          : undefined,
      resendApiKey:
        typeof body.resendApiKey === "string" && body.resendApiKey.trim()
          ? body.resendApiKey
          : undefined,
      sesAccessKeyId:
        typeof body.sesAccessKeyId === "string" || body.sesAccessKeyId === null
          ? (body.sesAccessKeyId as string | null)
          : undefined,
      sesSecretAccessKey:
        typeof body.sesSecretAccessKey === "string" &&
        body.sesSecretAccessKey.trim()
          ? body.sesSecretAccessKey
          : undefined,
      sesRegion:
        typeof body.sesRegion === "string" ? body.sesRegion : undefined,
      isConnected:
        typeof body.isConnected === "boolean" ? body.isConnected : undefined,
      crmSyncEnabled:
        typeof body.crmSyncEnabled === "boolean"
          ? body.crmSyncEnabled
          : undefined,
      automationEnabled:
        typeof body.automationEnabled === "boolean"
          ? body.automationEnabled
          : undefined,
      analyticsEnabled:
        typeof body.analyticsEnabled === "boolean"
          ? body.analyticsEnabled
          : undefined,
      openTrackingEnabled:
        typeof body.openTrackingEnabled === "boolean"
          ? body.openTrackingEnabled
          : undefined,
      clickTrackingEnabled:
        typeof body.clickTrackingEnabled === "boolean"
          ? body.clickTrackingEnabled
          : undefined,
      regenerateWebhookSecret: body.regenerateWebhookSecret === true,
      regenerateTrackingSecret: body.regenerateTrackingSecret === true,
    });

    return NextResponse.json({ settings: toPublicSettings(settings) });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
