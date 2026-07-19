import { migrateGuardianSchema } from "@/lib/guardian/migrate";
import {
  createGuardianLog,
  createMonitorEvent,
  ensureWorkspaceGuardian,
  getFindingById,
  getRepairById,
  listGuardianLogs,
  updateFinding,
  updateRepair,
} from "@/lib/guardian/repository";
import { sqlite } from "@/lib/db";
import type { GuardianRepair } from "@/lib/guardian/types";

async function applyAction(
  workspaceId: string,
  repair: GuardianRepair,
): Promise<string> {
  switch (repair.action) {
    case "enable_foreign_keys": {
      sqlite.pragma("foreign_keys = ON");
      return "Enabled SQLite foreign_keys pragma.";
    }
    case "vacuum_database": {
      sqlite.exec("VACUUM");
      return "SQLite VACUUM completed.";
    }
    case "run_migration": {
      const moduleName = String(repair.metadata.moduleName || "guardian");
      if (moduleName !== "guardian") {
        throw new Error(
          `One-click migration is only supported for guardian (got ${moduleName}).`,
        );
      }
      migrateGuardianSchema();
      return "Guardian schema migration applied.";
    }
    case "create_workspace_settings": {
      const moduleName = String(repair.metadata.module || "guardian");
      if (moduleName === "guardian") {
        ensureWorkspaceGuardian(workspaceId);
        return "Guardian settings ensured.";
      }
      if (moduleName === "deployment") {
        try {
          const { ensureWorkspaceDeployment } = await import(
            "@/lib/deployment/repository"
          );
          ensureWorkspaceDeployment(workspaceId);
          return "Deployment settings ensured.";
        } catch {
          throw new Error(
            "Deployment module is unavailable; open /deployment once to bootstrap.",
          );
        }
      }
      throw new Error(`Unsupported settings module: ${moduleName}`);
    }
    case "retry_health_check": {
      if (String(repair.metadata.path || "").startsWith("/")) {
        return "API health retry recorded. Re-run a Guardian scan to refresh results.";
      }
      try {
        const { runWorkspaceHealthChecks } = await import(
          "@/lib/deployment/engine/health"
        );
        const checks = await runWorkspaceHealthChecks(workspaceId);
        return `Deployment health checks completed (${checks.length} result(s)).`;
      } catch {
        return "Health check retry queued. Re-run a Guardian scan for updated API/deployment status.";
      }
    }
    case "analyze_logs": {
      const logs = listGuardianLogs(workspaceId, { status: "error", limit: 50 });
      const counts = new Map<string, number>();
      for (const log of logs) {
        counts.set(log.operation, (counts.get(log.operation) || 0) + 1);
      }
      const top = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([op, count]) => `${op}×${count}`);
      return top.length
        ? `Top error operations: ${top.join(", ")}`
        : "No recent Guardian error logs to analyze.";
    }
    case "clear_stale_cache": {
      const { cacheClear, getCacheStats } = await import("@/lib/platform/cache");
      const before = getCacheStats();
      cacheClear();
      return `Cleared platform cache (${before.size} entries, driver=${before.driver}).`;
    }
    case "document_env_var":
    case "install_dependency":
    case "rotate_secret":
    case "review_security":
    case "custom":
      throw new Error(
        "This repair requires manual action and cannot be applied automatically.",
      );
    default:
      throw new Error(`Unsupported repair action: ${repair.action}`);
  }
}

export async function applyGuardianRepair(options: {
  workspaceId: string;
  repairId: string;
  userId?: string | null;
}): Promise<GuardianRepair> {
  ensureWorkspaceGuardian(options.workspaceId);
  const repair = getRepairById(options.workspaceId, options.repairId);
  if (!repair) throw new Error("Repair not found.");
  if (!repair.oneClick) {
    throw new Error("This repair is manual-only and cannot be one-click applied.");
  }
  if (repair.status === "applied") {
    throw new Error("Repair already applied.");
  }

  updateRepair(options.workspaceId, repair.id, { status: "applying" });
  if (repair.findingId) {
    updateFinding(options.workspaceId, repair.findingId, {
      status: "repairing",
    });
  }

  try {
    const summary = await applyAction(options.workspaceId, repair);
    const applied = updateRepair(options.workspaceId, repair.id, {
      status: "applied",
      resultSummary: summary,
      errorMessage: null,
      appliedAt: new Date().toISOString(),
      appliedByUserId: options.userId || null,
    });

    if (repair.findingId) {
      const finding = getFindingById(options.workspaceId, repair.findingId);
      if (finding) {
        updateFinding(options.workspaceId, finding.id, {
          status: "resolved",
          resolvedAt: new Date().toISOString(),
          resolvedByUserId: options.userId || null,
        });
      }
    }

    createMonitorEvent(options.workspaceId, {
      type: "repair_applied",
      severity: "info",
      title: `Repair applied: ${repair.title}`,
      message: summary,
      repairId: repair.id,
      findingId: repair.findingId,
      scanId: repair.scanId,
    });

    createGuardianLog(options.workspaceId, {
      operation: "repair.apply",
      status: "success",
      repairId: repair.id,
      findingId: repair.findingId,
      scanId: repair.scanId,
      requestSummary: repair.action,
      responseSummary: summary,
    });

    return applied;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Repair application failed.";
    const failed = updateRepair(options.workspaceId, repair.id, {
      status: "failed",
      errorMessage: message,
    });

    if (repair.findingId) {
      updateFinding(options.workspaceId, repair.findingId, {
        status: "failed",
      });
    }

    createMonitorEvent(options.workspaceId, {
      type: "repair_failed",
      severity: "high",
      title: `Repair failed: ${repair.title}`,
      message,
      repairId: repair.id,
      findingId: repair.findingId,
      scanId: repair.scanId,
    });

    createGuardianLog(options.workspaceId, {
      operation: "repair.apply",
      status: "error",
      repairId: repair.id,
      findingId: repair.findingId,
      scanId: repair.scanId,
      errorMessage: message,
    });

    throw new Error(message);
  }
}
