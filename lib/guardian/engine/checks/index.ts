import { runApiChecks } from "@/lib/guardian/engine/checks/api";
import { runDatabaseChecks } from "@/lib/guardian/engine/checks/database";
import { runDependencyChecks } from "@/lib/guardian/engine/checks/dependencies";
import { runDeploymentChecks } from "@/lib/guardian/engine/checks/deployment";
import { runEnvChecks } from "@/lib/guardian/engine/checks/env";
import { runIntegrityChecks } from "@/lib/guardian/engine/checks/integrity";
import { runLogChecks } from "@/lib/guardian/engine/checks/logs";
import { runPerformanceChecks } from "@/lib/guardian/engine/checks/performance";
import { runSecurityChecks } from "@/lib/guardian/engine/checks/security";
import { ensureWorkspaceGuardian } from "@/lib/guardian/repository";
import type {
  GuardianCheckCategory,
  GuardianCheckOutput,
} from "@/lib/guardian/types";

const RUNNERS: Record<
  GuardianCheckCategory,
  (workspaceId: string) => Promise<GuardianCheckOutput[]>
> = {
  database: runDatabaseChecks,
  api: runApiChecks,
  deployment: runDeploymentChecks,
  env: runEnvChecks,
  dependencies: runDependencyChecks,
  integrity: runIntegrityChecks,
  performance: runPerformanceChecks,
  security: runSecurityChecks,
  logs: runLogChecks,
  system: async () => [
    {
      category: "system",
      checkKey: "system.uptime",
      title: "Process uptime",
      status: "pass",
      severity: "info",
      message: `Process uptime ${Math.round(process.uptime())}s.`,
      details: { uptimeSec: Math.round(process.uptime()) },
    },
  ],
};

export async function runChecksForCategories(
  workspaceId: string,
  categories: GuardianCheckCategory[],
): Promise<GuardianCheckOutput[]> {
  const settings = ensureWorkspaceGuardian(workspaceId);
  const outputs: GuardianCheckOutput[] = [];

  for (const category of categories) {
    if (category === "security" && !settings.securityChecksEnabled) continue;
    if (category === "performance" && !settings.performanceChecksEnabled)
      continue;
    if (category === "logs" && !settings.logAnalysisEnabled) continue;

    const runner = RUNNERS[category];
    if (!runner) continue;
    try {
      outputs.push(...(await runner(workspaceId)));
    } catch (error) {
      outputs.push({
        category,
        checkKey: `${category}.error`,
        title: `${category} checks failed`,
        status: "error",
        severity: "high",
        message:
          error instanceof Error
            ? error.message
            : `Unexpected error running ${category} checks.`,
      });
    }
  }

  return outputs;
}

export {
  runApiChecks,
  runDatabaseChecks,
  runDependencyChecks,
  runDeploymentChecks,
  runEnvChecks,
  runIntegrityChecks,
  runLogChecks,
  runPerformanceChecks,
  runSecurityChecks,
};
