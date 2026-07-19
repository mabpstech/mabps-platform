import type { GuardianCheckCategory, GuardianSeverity } from "@/lib/guardian/types";
import { GUARDIAN_CHECK_CATEGORIES } from "@/lib/guardian/types";

export const DEFAULT_SCAN_INTERVAL_SEC = 900;
export const DEFAULT_RETENTION_SCANS = 50;
export const DEFAULT_API_PROBE_TIMEOUT_MS = 8_000;

/** Platform-critical env vars expected in production. */
export const REQUIRED_ENV_VARS = [
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "DATABASE_URL",
] as const;

/** Optional but recommended env vars. */
export const RECOMMENDED_ENV_VARS = [
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

/** Core package dependencies that should resolve. */
export const CRITICAL_DEPENDENCIES = [
  "next",
  "react",
  "react-dom",
  "better-auth",
  "better-sqlite3",
] as const;

/** Expected module schema tables for integrity checks. */
export const MODULE_SCHEMA_TABLES: Record<string, string[]> = {
  auth: ["user", "session", "organization", "member"],
  billing: ["subscription", "billing_customer"],
  website: ["website_site", "website_page"],
  crm: ["crm_contact", "crm_lead"],
  ai: ["ai_settings", "ai_conversation"],
  automation: ["automation_workflow"],
  analytics: ["analytics_event"],
  notifications: ["notification_settings", "notification"],
  deployment: ["deployment_settings", "deployment_project"],
  guardian: ["guardian_settings", "guardian_scan", "guardian_finding"],
};

export const ALL_CHECK_CATEGORIES: GuardianCheckCategory[] = [
  ...GUARDIAN_CHECK_CATEGORIES,
];

export function truncateSummary(text: string, max = 240): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function severityRank(severity: GuardianSeverity): number {
  switch (severity) {
    case "critical":
      return 5;
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    default:
      return 1;
  }
}

export function maxSeverity(
  a: GuardianSeverity,
  b: GuardianSeverity,
): GuardianSeverity {
  return severityRank(a) >= severityRank(b) ? a : b;
}
