import { createHash, randomBytes } from "node:crypto";
import type {
  DeploymentEnvironment,
  DeploymentProvider,
  EnvTarget,
} from "@/lib/deployment/types";

export const DEFAULT_DEPLOYMENT_PROVIDER: DeploymentProvider = "vercel";
export const DEFAULT_PRODUCTION_BRANCH = "main";
export const DEFAULT_FRAMEWORK = "nextjs";
export const DEFAULT_HEALTH_CHECK_PATH = "/";
export const DEFAULT_HEALTH_CHECK_INTERVAL_SEC = 300;
export const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 10_000;
export const DEFAULT_RETENTION_DEPLOYMENTS = 50;
export const DEFAULT_CNAME_TARGET = "cname.vercel-dns.com";
export const DEFAULT_CLOUDFLARE_CNAME_TARGET = "pages.dev";

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function generateVerificationToken(): string {
  return `mabps-verify-${randomBytes(16).toString("hex")}`;
}

export function generateCommitSha(): string {
  return randomBytes(20).toString("hex");
}

export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function isValidHostname(hostname: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
    hostname,
  );
}

export function isValidEnvKey(key: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/.test(key);
}

export function normalizeEnvKey(key: string): string {
  return key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

export function truncateSummary(text: string, max = 240): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function defaultCnameTarget(provider: DeploymentProvider): string {
  if (provider === "cloudflare") return DEFAULT_CLOUDFLARE_CNAME_TARGET;
  return DEFAULT_CNAME_TARGET;
}

export function resolveEnvTargets(target: EnvTarget): DeploymentEnvironment[] {
  if (target === "all") {
    return ["production", "preview", "development"];
  }
  return [target];
}
