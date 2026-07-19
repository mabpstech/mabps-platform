import { MODULE_SCHEMA_TABLES } from "@/lib/guardian/defaults";
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

export async function runIntegrityChecks(
  workspaceId: string,
): Promise<GuardianCheckOutput[]> {
  const outputs: GuardianCheckOutput[] = [];
  const missingByModule: Record<string, string[]> = {};

  for (const [moduleName, tables] of Object.entries(MODULE_SCHEMA_TABLES)) {
    const missing = tables.filter((table) => !tableExists(table));
    if (missing.length) missingByModule[moduleName] = missing;
  }

  const missingModules = Object.keys(missingByModule);
  outputs.push({
    category: "integrity",
    checkKey: "integrity.module_schemas",
    title: "Module schema tables",
    status: missingModules.length ? "warn" : "pass",
    severity: missingModules.length ? "medium" : "info",
    message: missingModules.length
      ? `Missing tables for modules: ${missingModules.join(", ")}`
      : "All expected module schema tables are present.",
    details: { missingByModule, workspaceId },
    findings: Object.entries(missingByModule).flatMap(([moduleName, tables]) =>
      tables.map((table) => ({
        code: `INTEGRITY_MISSING_TABLE_${table.toUpperCase()}`,
        title: `Missing table: ${table}`,
        description: `Module "${moduleName}" expects table "${table}" which is not in the database.`,
        severity: "medium" as const,
        evidence: { moduleName, table },
        suggestion: `Run the ${moduleName} migration script (npm run db:migrate:${moduleName === "auth" ? "" : moduleName}).`,
        autoRepairable: moduleName === "guardian",
        repair: {
          action: "run_migration" as const,
          title: `Migrate ${moduleName} schema`,
          description: `Apply the ${moduleName} schema so table "${table}" exists.`,
          oneClick: moduleName === "guardian",
          riskLevel: "low" as const,
          steps: [
            moduleName === "guardian"
              ? "Apply Guardian schema via one-click repair"
              : `Run npm run db:migrate:${moduleName}`,
            "Re-run Guardian integrity checks",
          ],
          metadata: { moduleName, table },
        },
      })),
    ),
  });

  const org = sqlite
    .prepare(`SELECT id FROM "organization" WHERE id = ?`)
    .get(workspaceId) as { id: string } | undefined;

  outputs.push({
    category: "integrity",
    checkKey: "integrity.workspace_row",
    title: "Workspace organization row",
    status: org ? "pass" : "fail",
    severity: org ? "info" : "critical",
    message: org
      ? "Active workspace organization exists."
      : "Active workspace organization row is missing.",
    findings: org
      ? undefined
      : [
          {
            code: "INTEGRITY_WORKSPACE_MISSING",
            title: "Workspace organization missing",
            description:
              "The active workspace id does not resolve to an organization row.",
            severity: "critical",
            suggestion: "Re-select or recreate the workspace from settings.",
            autoRepairable: false,
          },
        ],
  });

  return outputs;
}
