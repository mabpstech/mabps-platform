import { NextResponse } from "next/server";
import {
  requireGuardianManagerApi,
  requireGuardianMemberApi,
} from "@/lib/guardian/access";
import { guardianErrorResponse } from "@/lib/guardian/http";
import {
  ensureWorkspaceGuardian,
  toPublicSettings,
  updateGuardianSettings,
} from "@/lib/guardian/repository";

export async function GET() {
  try {
    const { workspace } = await requireGuardianMemberApi();
    return NextResponse.json({
      settings: toPublicSettings(ensureWorkspaceGuardian(workspace.id)),
    });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { workspace } = await requireGuardianManagerApi();
    ensureWorkspaceGuardian(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    const settings = updateGuardianSettings(workspace.id, {
      monitoringEnabled:
        typeof body.monitoringEnabled === "boolean"
          ? body.monitoringEnabled
          : undefined,
      autoScanEnabled:
        typeof body.autoScanEnabled === "boolean"
          ? body.autoScanEnabled
          : undefined,
      autoRepairSuggestionsEnabled:
        typeof body.autoRepairSuggestionsEnabled === "boolean"
          ? body.autoRepairSuggestionsEnabled
          : undefined,
      aiTroubleshootingEnabled:
        typeof body.aiTroubleshootingEnabled === "boolean"
          ? body.aiTroubleshootingEnabled
          : undefined,
      securityChecksEnabled:
        typeof body.securityChecksEnabled === "boolean"
          ? body.securityChecksEnabled
          : undefined,
      performanceChecksEnabled:
        typeof body.performanceChecksEnabled === "boolean"
          ? body.performanceChecksEnabled
          : undefined,
      logAnalysisEnabled:
        typeof body.logAnalysisEnabled === "boolean"
          ? body.logAnalysisEnabled
          : undefined,
      scanIntervalSec:
        typeof body.scanIntervalSec === "number"
          ? body.scanIntervalSec
          : undefined,
      retentionScans:
        typeof body.retentionScans === "number"
          ? body.retentionScans
          : undefined,
      alertWebhookUrl:
        typeof body.alertWebhookUrl === "string" ||
        body.alertWebhookUrl === null
          ? (body.alertWebhookUrl as string | null)
          : undefined,
    });

    return NextResponse.json({ settings: toPublicSettings(settings) });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
