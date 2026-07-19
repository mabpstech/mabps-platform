import {
  RECOMMENDED_ENV_VARS,
  REQUIRED_ENV_VARS,
} from "@/lib/guardian/defaults";
import type { GuardianCheckOutput } from "@/lib/guardian/types";

function isMissing(value: string | undefined): boolean {
  return !value || !value.trim() || value.includes("replace-with");
}

export async function runEnvChecks(
  _workspaceId: string,
): Promise<GuardianCheckOutput[]> {
  const missingRequired = REQUIRED_ENV_VARS.filter((key) =>
    isMissing(process.env[key]),
  );
  const missingRecommended = RECOMMENDED_ENV_VARS.filter((key) =>
    isMissing(process.env[key]),
  );

  const outputs: GuardianCheckOutput[] = [
    {
      category: "env",
      checkKey: "env.required",
      title: "Required environment variables",
      status: missingRequired.length ? "fail" : "pass",
      severity: missingRequired.length ? "critical" : "info",
      message: missingRequired.length
        ? `Missing required vars: ${missingRequired.join(", ")}`
        : "All required environment variables are set.",
      details: { missingRequired },
      findings: missingRequired.map((key) => ({
        code: `ENV_MISSING_${key}`,
        title: `Missing required env: ${key}`,
        description: `The platform expects ${key} to be configured for production readiness.`,
        severity: "critical" as const,
        evidence: { key },
        suggestion: `Set ${key} in your environment or .env file.`,
        autoRepairable: false,
        repair: {
          action: "document_env_var" as const,
          title: `Configure ${key}`,
          description: `Add ${key} to the deployment environment.`,
          oneClick: false,
          riskLevel: "medium" as const,
          steps: [
            `Add ${key} to .env / deployment secrets`,
            "Restart the application",
            "Re-run Guardian env checks",
          ],
          metadata: { key },
        },
      })),
    },
    {
      category: "env",
      checkKey: "env.recommended",
      title: "Recommended environment variables",
      status: missingRecommended.length ? "warn" : "pass",
      severity: missingRecommended.length ? "low" : "info",
      message: missingRecommended.length
        ? `Recommended vars not set: ${missingRecommended.join(", ")}`
        : "All recommended environment variables are set.",
      details: { missingRecommended },
      findings: missingRecommended.map((key) => ({
        code: `ENV_RECOMMENDED_${key}`,
        title: `Recommended env missing: ${key}`,
        description: `${key} is optional but recommended for full platform capabilities.`,
        severity: "low" as const,
        evidence: { key },
        suggestion: `Consider setting ${key} for production.`,
        autoRepairable: false,
        repair: {
          action: "document_env_var" as const,
          title: `Optionally configure ${key}`,
          description: `Set ${key} if you need the related feature.`,
          oneClick: false,
          riskLevel: "low" as const,
          steps: [`Add ${key} if required by your deployment`],
          metadata: { key },
        },
      })),
    },
  ];

  const secret = process.env.BETTER_AUTH_SECRET || "";
  const weakSecret =
    secret.length > 0 &&
    (secret.length < 32 || secret.includes("replace-with"));
  outputs.push({
    category: "env",
    checkKey: "env.auth_secret_strength",
    title: "Auth secret strength",
    status: weakSecret ? "fail" : secret ? "pass" : "fail",
    severity: weakSecret || !secret ? "high" : "info",
    message: !secret
      ? "BETTER_AUTH_SECRET is not set."
      : weakSecret
        ? "BETTER_AUTH_SECRET appears weak or is still a placeholder."
        : "BETTER_AUTH_SECRET meets minimum length.",
    findings:
      !secret || weakSecret
        ? [
            {
              code: "ENV_WEAK_AUTH_SECRET",
              title: "Weak or missing BETTER_AUTH_SECRET",
              description:
                "Use a high-entropy secret (32+ chars). Generate with openssl rand -base64 32.",
              severity: "high",
              suggestion: "Rotate BETTER_AUTH_SECRET to a strong random value.",
              autoRepairable: false,
              repair: {
                action: "rotate_secret",
                title: "Rotate BETTER_AUTH_SECRET",
                description:
                  "Generate a new secret and update the environment.",
                oneClick: false,
                riskLevel: "high",
                steps: [
                  "Run: openssl rand -base64 32",
                  "Set BETTER_AUTH_SECRET",
                  "Restart the application (existing sessions may invalidate)",
                ],
              },
            },
          ]
        : undefined,
  });

  return outputs;
}
