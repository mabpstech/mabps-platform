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

export async function runDeploymentChecks(
  workspaceId: string,
): Promise<GuardianCheckOutput[]> {
  const outputs: GuardianCheckOutput[] = [];

  if (!tableExists("deployment_settings")) {
    outputs.push({
      category: "deployment",
      checkKey: "deploy.module_ready",
      title: "Deployment module schema",
      status: "skip",
      severity: "info",
      message:
        "Deployment module schema is not installed; skipping deployment health checks.",
    });
    return outputs;
  }

  const settings = sqlite
    .prepare(
      `SELECT * FROM "deployment_settings" WHERE "workspaceId" = ?`,
    )
    .get(workspaceId) as Record<string, unknown> | undefined;

  outputs.push({
    category: "deployment",
    checkKey: "deploy.settings",
    title: "Deployment settings bootstrap",
    status: settings ? "pass" : "warn",
    severity: settings ? "info" : "low",
    message: settings
      ? "Deployment settings exist for this workspace."
      : "Deployment settings have not been created yet.",
    findings: settings
      ? undefined
      : [
          {
            code: "DEPLOY_SETTINGS_MISSING",
            title: "Deployment settings missing",
            description:
              "Visit /deployment to bootstrap settings, or create them via the Deployment module.",
            severity: "low",
            suggestion: "Open the Deployment module once to seed workspace settings.",
            autoRepairable: true,
            repair: {
              action: "create_workspace_settings",
              title: "Bootstrap deployment settings",
              description:
                "Create default deployment settings for the active workspace.",
              oneClick: true,
              riskLevel: "low",
              steps: [
                "Insert default deployment_settings row",
                "Re-run deployment health checks",
              ],
              metadata: { module: "deployment" },
            },
          },
        ],
  });

  if (!tableExists("deployment_project")) {
    return outputs;
  }

  const projectCount = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment_project" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const failedToday = tableExists("deployment")
    ? (
        sqlite
          .prepare(
            `SELECT COUNT(*) as c FROM "deployment"
             WHERE "workspaceId" = ? AND "status" = 'failed'
               AND "createdAt" >= date('now')`,
          )
          .get(workspaceId) as { c: number }
      ).c
    : 0;

  outputs.push({
    category: "deployment",
    checkKey: "deploy.projects",
    title: "Deployment projects",
    status: "pass",
    severity: "info",
    message: `${projectCount} project(s) configured.`,
    details: { projectCount },
  });

  outputs.push({
    category: "deployment",
    checkKey: "deploy.failed_today",
    title: "Failed deployments today",
    status: failedToday > 0 ? "warn" : "pass",
    severity: failedToday > 0 ? "medium" : "info",
    message:
      failedToday > 0
        ? `${failedToday} failed deployment(s) today.`
        : "No failed deployments today.",
    details: { failedToday },
    findings:
      failedToday > 0
        ? [
            {
              code: "DEPLOY_FAILURES_TODAY",
              title: "Recent deployment failures",
              description: `${failedToday} deployment(s) failed today in this workspace.`,
              severity: "medium",
              suggestion: "Review Deployment history and build logs.",
              autoRepairable: false,
            },
          ]
        : undefined,
  });

  if (tableExists("deployment_health_check")) {
    const down = (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "deployment_health_check"
           WHERE "workspaceId" = ? AND "status" = 'down'
             AND "checkedAt" >= datetime('now', '-1 day')`,
        )
        .get(workspaceId) as { c: number }
    ).c;

    outputs.push({
      category: "deployment",
      checkKey: "deploy.health_down",
      title: "Deployment URL health",
      status: down > 0 ? "fail" : "pass",
      severity: down > 0 ? "high" : "info",
      message:
        down > 0
          ? `${down} down health check(s) in the last 24h.`
          : "No down deployment health checks in the last 24h.",
      findings:
        down > 0
          ? [
              {
                code: "DEPLOY_HEALTH_DOWN",
                title: "Published URLs reporting down",
                description:
                  "One or more deployment health probes failed in the last day.",
                severity: "high",
                suggestion: "Run Deployment health checks and inspect domains/SSL.",
                autoRepairable: true,
                repair: {
                  action: "retry_health_check",
                  title: "Re-run deployment health probes",
                  description:
                    "Trigger workspace deployment health checks again.",
                  oneClick: true,
                  riskLevel: "low",
                  steps: [
                    "Call Deployment health engine",
                    "Review new health results",
                  ],
                },
              },
            ]
          : undefined,
    });
  }

  return outputs;
}
