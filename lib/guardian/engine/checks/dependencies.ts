import fs from "node:fs";
import path from "node:path";
import { CRITICAL_DEPENDENCIES } from "@/lib/guardian/defaults";
import type { GuardianCheckOutput } from "@/lib/guardian/types";

function packageInstalled(name: string): boolean {
  try {
    const pkgPath = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "node_modules",
      ...name.split("/"),
      "package.json",
    );
    return fs.existsSync(pkgPath);
  } catch {
    return false;
  }
}

export async function runDependencyChecks(
  _workspaceId: string,
): Promise<GuardianCheckOutput[]> {
  const missing = CRITICAL_DEPENDENCIES.filter((name) => !packageInstalled(name));
  const packageJsonPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "package.json",
  );
  const hasPackageJson = fs.existsSync(packageJsonPath);

  const outputs: GuardianCheckOutput[] = [
    {
      category: "dependencies",
      checkKey: "deps.package_json",
      title: "package.json present",
      status: hasPackageJson ? "pass" : "fail",
      severity: hasPackageJson ? "info" : "critical",
      message: hasPackageJson
        ? "package.json found."
        : "package.json is missing from the project root.",
      findings: hasPackageJson
        ? undefined
        : [
            {
              code: "DEPS_PACKAGE_JSON_MISSING",
              title: "package.json missing",
              description:
                "The project root does not contain package.json; dependency checks cannot proceed.",
              severity: "critical",
              autoRepairable: false,
            },
          ],
    },
    {
      category: "dependencies",
      checkKey: "deps.critical",
      title: "Critical dependencies installed",
      status: missing.length ? "fail" : "pass",
      severity: missing.length ? "high" : "info",
      message: missing.length
        ? `Missing packages: ${missing.join(", ")}`
        : "All critical dependencies are installed.",
      details: { missing, checked: CRITICAL_DEPENDENCIES },
      findings: missing.map((name) => ({
        code: `DEPS_MISSING_${name.replace(/[^A-Z0-9]+/gi, "_").toUpperCase()}`,
        title: `Missing dependency: ${name}`,
        description: `${name} is required by the MABPS platform but was not found in node_modules.`,
        severity: "high" as const,
        evidence: { name },
        suggestion: `Run npm install (or yarn/pnpm) to install ${name}.`,
        autoRepairable: false,
        repair: {
          action: "install_dependency" as const,
          title: `Install ${name}`,
          description: `Install the missing package ${name}.`,
          oneClick: false,
          riskLevel: "medium" as const,
          steps: ["Run npm install in the project root", "Re-run Guardian dependency checks"],
          metadata: { name },
        },
      })),
    },
  ];

  return outputs;
}
