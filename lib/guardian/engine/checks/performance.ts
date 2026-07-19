import { sqlite } from "@/lib/db";
import type { GuardianCheckOutput } from "@/lib/guardian/types";

export async function runPerformanceChecks(
  workspaceId: string,
): Promise<GuardianCheckOutput[]> {
  const outputs: GuardianCheckOutput[] = [];
  const started = Date.now();

  try {
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "guardian_scan" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId);
    const latencyMs = Date.now() - started;
    outputs.push({
      category: "performance",
      checkKey: "perf.db_query_latency",
      title: "Database query latency",
      status: latencyMs > 250 ? "warn" : "pass",
      severity: latencyMs > 1000 ? "high" : latencyMs > 250 ? "medium" : "info",
      message: `Sample query completed in ${latencyMs}ms.`,
      latencyMs,
      details: { thresholdWarnMs: 250, thresholdHighMs: 1000 },
      findings:
        latencyMs > 250
          ? [
              {
                code: "PERF_DB_SLOW",
                title: "Elevated database latency",
                description: `A simple workspace-scoped query took ${latencyMs}ms.`,
                severity: latencyMs > 1000 ? "high" : "medium",
                suggestion:
                  "Consider VACUUM, reducing retention, or moving the DB to faster storage.",
                autoRepairable: latencyMs > 250,
                repair: {
                  action: "vacuum_database",
                  title: "Vacuum SQLite database",
                  description:
                    "Run VACUUM to reclaim space and potentially improve read performance.",
                  oneClick: true,
                  riskLevel: "low",
                  steps: [
                    "Execute VACUUM on the active SQLite database",
                    "Re-run performance checks",
                  ],
                },
              },
            ]
          : undefined,
    });
  } catch (error) {
    outputs.push({
      category: "performance",
      checkKey: "perf.db_query_latency",
      title: "Database query latency",
      status: "error",
      severity: "high",
      message:
        error instanceof Error
          ? error.message
          : "Unable to measure query latency.",
    });
  }

  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMb = Math.round(mem.rss / 1024 / 1024);
  outputs.push({
    category: "performance",
    checkKey: "perf.memory",
    title: "Process memory usage",
    status: heapUsedMb > 512 ? "warn" : "pass",
    severity: heapUsedMb > 1024 ? "high" : heapUsedMb > 512 ? "medium" : "info",
    message: `Heap ${heapUsedMb}MB · RSS ${rssMb}MB.`,
    details: { heapUsedMb, rssMb },
    findings:
      heapUsedMb > 512
        ? [
            {
              code: "PERF_HIGH_MEMORY",
              title: "High Node.js heap usage",
              description: `Heap usage is ${heapUsedMb}MB.`,
              severity: heapUsedMb > 1024 ? "high" : "medium",
              suggestion:
                "Investigate memory leaks, reduce retention windows, or scale the process.",
              autoRepairable: false,
            },
          ]
        : undefined,
  });

  return outputs;
}
