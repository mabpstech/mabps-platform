import { listGuardianLogs } from "@/lib/guardian/repository";
import { sqlite } from "@/lib/db";
import type { GuardianCheckOutput } from "@/lib/guardian/types";

function tableExists(name: string): boolean {
  const row = sqlite
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(name) as { name: string } | undefined;
  return Boolean(row?.name);
}

export async function runLogChecks(
  workspaceId: string,
): Promise<GuardianCheckOutput[]> {
  const logs = listGuardianLogs(workspaceId, { limit: 100 });
  const errors = logs.filter((log) => log.status === "error");
  const recentErrorOps = errors.slice(0, 10).map((log) => log.operation);

  const outputs: GuardianCheckOutput[] = [
    {
      category: "logs",
      checkKey: "logs.guardian_errors",
      title: "Guardian operation errors",
      status: errors.length > 5 ? "fail" : errors.length > 0 ? "warn" : "pass",
      severity:
        errors.length > 5 ? "high" : errors.length > 0 ? "medium" : "info",
      message:
        errors.length === 0
          ? "No recent Guardian operation errors."
          : `${errors.length} error log(s) in the latest 100 operations.`,
      details: { errorCount: errors.length, recentErrorOps },
      findings:
        errors.length > 0
          ? [
              {
                code: "LOGS_GUARDIAN_ERRORS",
                title: "Guardian error logs detected",
                description: `Recent failing operations: ${recentErrorOps.join(", ") || "n/a"}.`,
                severity: errors.length > 5 ? "high" : "medium",
                suggestion: "Open Guardian Logs and investigate failing operations.",
                autoRepairable: true,
                repair: {
                  action: "analyze_logs",
                  title: "Analyze recent error logs",
                  description:
                    "Summarize recent Guardian error patterns and open findings.",
                  oneClick: true,
                  riskLevel: "low",
                  steps: [
                    "Scan recent error operations",
                    "Group by operation name",
                    "Surface top patterns",
                  ],
                },
              },
            ]
          : undefined,
    },
  ];

  if (tableExists("deployment_log")) {
    const deployErrors = (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "deployment_log"
           WHERE "workspaceId" = ? AND "status" = 'error'
             AND "createdAt" >= datetime('now', '-1 day')`,
        )
        .get(workspaceId) as { c: number }
    ).c;

    outputs.push({
      category: "logs",
      checkKey: "logs.deployment_errors",
      title: "Deployment operation errors (24h)",
      status: deployErrors > 0 ? "warn" : "pass",
      severity: deployErrors > 0 ? "medium" : "info",
      message:
        deployErrors > 0
          ? `${deployErrors} deployment error log(s) in the last 24h.`
          : "No deployment error logs in the last 24h.",
      details: { deployErrors },
    });
  }

  return outputs;
}
