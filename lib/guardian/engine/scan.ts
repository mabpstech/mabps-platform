import { ALL_CHECK_CATEGORIES, truncateSummary } from "@/lib/guardian/defaults";
import { runChecksForCategories } from "@/lib/guardian/engine/checks";
import {
  createCheckResult,
  createFinding,
  createGuardianLog,
  createMonitorEvent,
  createRepair,
  createScan,
  ensureWorkspaceGuardian,
  pruneOldScans,
  updateScan,
} from "@/lib/guardian/repository";
import type {
  GuardianCheckCategory,
  GuardianHealthStatus,
  GuardianScan,
  GuardianScanTrigger,
  GuardianSeverity,
} from "@/lib/guardian/types";

function deriveHealth(
  critical: number,
  high: number,
  medium: number,
): GuardianHealthStatus {
  if (critical > 0) return "unhealthy";
  if (high > 0 || medium > 3) return "degraded";
  return "healthy";
}

export async function runGuardianScan(options: {
  workspaceId: string;
  categories?: GuardianCheckCategory[];
  trigger?: GuardianScanTrigger;
  createdByUserId?: string | null;
}): Promise<GuardianScan> {
  const settings = ensureWorkspaceGuardian(options.workspaceId);
  const categories =
    options.categories?.length ? options.categories : ALL_CHECK_CATEGORIES;

  const scan = createScan(options.workspaceId, {
    trigger: options.trigger || "manual",
    categories,
    createdByUserId: options.createdByUserId || null,
  });

  createMonitorEvent(options.workspaceId, {
    type: "scan_started",
    severity: "info",
    title: "Guardian scan started",
    message: `Categories: ${categories.join(", ")}`,
    scanId: scan.id,
  });

  updateScan(options.workspaceId, scan.id, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  const started = Date.now();

  try {
    const outputs = await runChecksForCategories(
      options.workspaceId,
      categories,
    );

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let findingsCount = 0;

    for (const output of outputs) {
      createCheckResult(options.workspaceId, {
        scanId: scan.id,
        category: output.category,
        checkKey: output.checkKey,
        title: output.title,
        status: output.status,
        severity: output.severity,
        message: output.message,
        latencyMs: output.latencyMs ?? null,
        details: output.details || {},
      });

      for (const finding of output.findings || []) {
        findingsCount += 1;
        const severity: GuardianSeverity = finding.severity;
        if (severity === "critical") criticalCount += 1;
        else if (severity === "high") highCount += 1;
        else if (severity === "medium") mediumCount += 1;
        else lowCount += 1;

        const created = createFinding(options.workspaceId, {
          scanId: scan.id,
          category: output.category,
          code: finding.code,
          title: finding.title,
          description: finding.description,
          severity,
          evidence: finding.evidence || {},
          suggestion: finding.suggestion || null,
          autoRepairable: Boolean(finding.autoRepairable),
        });

        if (settings.autoRepairSuggestionsEnabled && finding.repair) {
          createRepair(options.workspaceId, {
            findingId: created.id,
            scanId: scan.id,
            action: finding.repair.action,
            title: finding.repair.title,
            description: finding.repair.description,
            oneClick: finding.repair.oneClick,
            riskLevel: finding.repair.riskLevel,
            steps: finding.repair.steps,
            metadata: finding.repair.metadata || {},
            status: finding.repair.oneClick ? "suggested" : "manual",
          });
        }
      }
    }

    const healthStatus = deriveHealth(criticalCount, highCount, mediumCount);
    const summary = truncateSummary(
      `Scan complete · ${findingsCount} finding(s) · critical ${criticalCount} · high ${highCount} · health ${healthStatus}`,
    );

    const completed = updateScan(options.workspaceId, scan.id, {
      status: "completed",
      healthStatus,
      summary,
      findingsCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      durationMs: Date.now() - started,
      finishedAt: new Date().toISOString(),
      errorMessage: null,
    });

    createMonitorEvent(options.workspaceId, {
      type: "scan_completed",
      severity:
        healthStatus === "healthy"
          ? "info"
          : healthStatus === "degraded"
            ? "medium"
            : "critical",
      title: "Guardian scan completed",
      message: summary,
      scanId: scan.id,
    });

    createGuardianLog(options.workspaceId, {
      operation: "scan.run",
      status: "success",
      scanId: scan.id,
      requestSummary: categories.join(","),
      responseSummary: summary,
    });

    pruneOldScans(options.workspaceId);
    return completed;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Guardian scan failed.";
    const failed = updateScan(options.workspaceId, scan.id, {
      status: "failed",
      healthStatus: "unknown",
      errorMessage: message,
      durationMs: Date.now() - started,
      finishedAt: new Date().toISOString(),
      summary: truncateSummary(`Scan failed: ${message}`),
    });

    createMonitorEvent(options.workspaceId, {
      type: "scan_failed",
      severity: "critical",
      title: "Guardian scan failed",
      message,
      scanId: scan.id,
    });

    createGuardianLog(options.workspaceId, {
      operation: "scan.run",
      status: "error",
      scanId: scan.id,
      errorMessage: message,
    });

    return failed;
  }
}
