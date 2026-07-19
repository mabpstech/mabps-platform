import { runGuardianScan } from "@/lib/guardian/engine/scan";
import {
  createMonitorEvent,
  ensureWorkspaceGuardian,
  getGuardianOverview,
  listScans,
} from "@/lib/guardian/repository";
import type { GuardianScan } from "@/lib/guardian/types";

export async function runGuardianMonitorTick(options: {
  workspaceId: string;
  force?: boolean;
  createdByUserId?: string | null;
}): Promise<{
  scanned: boolean;
  scan: GuardianScan | null;
  overview: ReturnType<typeof getGuardianOverview>;
  message: string;
}> {
  const settings = ensureWorkspaceGuardian(options.workspaceId);
  const overview = getGuardianOverview(options.workspaceId);

  createMonitorEvent(options.workspaceId, {
    type: "monitor_tick",
    severity: "info",
    title: "Monitor tick",
    message: `Health ${overview.healthStatus} · open findings ${overview.openFindings}`,
  });

  if (!settings.monitoringEnabled && !options.force) {
    return {
      scanned: false,
      scan: null,
      overview,
      message: "Monitoring is disabled.",
    };
  }

  if (!settings.autoScanEnabled && !options.force) {
    return {
      scanned: false,
      scan: null,
      overview,
      message: "Auto-scan is disabled.",
    };
  }

  const last = listScans(options.workspaceId, { limit: 1 })[0];
  if (last?.startedAt && !options.force) {
    const elapsed =
      Date.now() - new Date(last.startedAt || last.createdAt).getTime();
    if (elapsed < settings.scanIntervalSec * 1000) {
      return {
        scanned: false,
        scan: last,
        overview,
        message: `Next auto-scan in ${Math.ceil((settings.scanIntervalSec * 1000 - elapsed) / 1000)}s.`,
      };
    }
  }

  const scan = await runGuardianScan({
    workspaceId: options.workspaceId,
    trigger: options.force ? "manual" : "monitor",
    createdByUserId: options.createdByUserId || null,
  });

  const eventType =
    scan.healthStatus === "healthy"
      ? "health_ok"
      : scan.healthStatus === "degraded"
        ? "health_degraded"
        : "health_unhealthy";

  createMonitorEvent(options.workspaceId, {
    type: eventType,
    severity:
      scan.healthStatus === "healthy"
        ? "info"
        : scan.healthStatus === "degraded"
          ? "medium"
          : "critical",
    title: `Workspace health ${scan.healthStatus}`,
    message: scan.summary,
    scanId: scan.id,
  });

  return {
    scanned: true,
    scan,
    overview: getGuardianOverview(options.workspaceId),
    message: scan.summary || "Monitor scan completed.",
  };
}
