import { sqlite } from "@/lib/db";
import type { GuardianCheckOutput } from "@/lib/guardian/types";

export async function runDatabaseChecks(
  _workspaceId: string,
): Promise<GuardianCheckOutput[]> {
  const outputs: GuardianCheckOutput[] = [];
  const started = Date.now();

  try {
    const ping = sqlite.prepare(`SELECT 1 as ok`).get() as { ok: number };
    outputs.push({
      category: "database",
      checkKey: "db.connectivity",
      title: "Database connectivity",
      status: ping?.ok === 1 ? "pass" : "fail",
      severity: ping?.ok === 1 ? "info" : "critical",
      message:
        ping?.ok === 1
          ? "SQLite responded successfully."
          : "SQLite connectivity check failed.",
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    outputs.push({
      category: "database",
      checkKey: "db.connectivity",
      title: "Database connectivity",
      status: "fail",
      severity: "critical",
      message:
        error instanceof Error ? error.message : "Database unreachable.",
      latencyMs: Date.now() - started,
      findings: [
        {
          code: "DB_CONNECTIVITY_FAILED",
          title: "Database is unreachable",
          description:
            "The platform could not execute a basic SQLite query. Check DATABASE_URL and file permissions.",
          severity: "critical",
          suggestion: "Verify DATABASE_URL and ensure the data directory is writable.",
          autoRepairable: false,
          repair: {
            action: "review_security",
            title: "Inspect database path and permissions",
            description:
              "Confirm DATABASE_URL points to a writable SQLite file and the process can open it.",
            oneClick: false,
            riskLevel: "high",
            steps: [
              "Check DATABASE_URL in the environment",
              "Ensure the parent directory exists and is writable",
              "Restart the application after fixing permissions",
            ],
          },
        },
      ],
    });
    return outputs;
  }

  try {
    const integrity = sqlite.pragma("integrity_check") as Array<{
      integrity_check: string;
    }>;
    const result = integrity?.[0]?.integrity_check || "unknown";
    const ok = result === "ok";
    outputs.push({
      category: "database",
      checkKey: "db.integrity",
      title: "Database integrity",
      status: ok ? "pass" : "fail",
      severity: ok ? "info" : "critical",
      message: ok
        ? "PRAGMA integrity_check returned ok."
        : `Integrity check reported: ${result}`,
      details: { result },
      findings: ok
        ? undefined
        : [
            {
              code: "DB_INTEGRITY_FAILED",
              title: "SQLite integrity check failed",
              description: `PRAGMA integrity_check returned "${result}".`,
              severity: "critical",
              evidence: { result },
              suggestion:
                "Restore from backup or rebuild the database after investigating corruption.",
              autoRepairable: false,
            },
          ],
    });
  } catch (error) {
    outputs.push({
      category: "database",
      checkKey: "db.integrity",
      title: "Database integrity",
      status: "error",
      severity: "high",
      message:
        error instanceof Error
          ? error.message
          : "Unable to run integrity check.",
    });
  }

  const foreignKeys = Number(sqlite.pragma("foreign_keys", { simple: true }));
  outputs.push({
    category: "database",
    checkKey: "db.foreign_keys",
    title: "Foreign keys enabled",
    status: foreignKeys === 1 ? "pass" : "warn",
    severity: foreignKeys === 1 ? "info" : "medium",
    message:
      foreignKeys === 1
        ? "Foreign key enforcement is enabled."
        : "Foreign key enforcement is disabled.",
    details: { foreignKeys },
    findings:
      foreignKeys === 1
        ? undefined
        : [
            {
              code: "DB_FOREIGN_KEYS_DISABLED",
              title: "Foreign keys are disabled",
              description:
                "SQLite foreign_keys pragma is off, which can leave orphaned rows across modules.",
              severity: "medium",
              suggestion: "Enable foreign key enforcement for this connection.",
              autoRepairable: true,
              repair: {
                action: "enable_foreign_keys",
                title: "Enable SQLite foreign keys",
                description:
                  "Run PRAGMA foreign_keys = ON on the active database connection.",
                oneClick: true,
                riskLevel: "low",
                steps: [
                  "Apply PRAGMA foreign_keys = ON",
                  "Re-run Guardian database checks",
                ],
              },
            },
          ],
  });

  const journalMode = String(
    sqlite.pragma("journal_mode", { simple: true }) || "unknown",
  ).toLowerCase();
  outputs.push({
    category: "database",
    checkKey: "db.journal_mode",
    title: "WAL journal mode",
    status: journalMode === "wal" ? "pass" : "warn",
    severity: journalMode === "wal" ? "info" : "low",
    message:
      journalMode === "wal"
        ? "Database is using WAL mode."
        : `Journal mode is "${journalMode}" (WAL recommended).`,
    details: { journalMode },
  });

  return outputs;
}
