import { NextResponse } from "next/server";
import { DeploymentAuthError } from "@/lib/deployment/access";
import {
  DEPLOYMENT_ENVIRONMENTS,
  DEPLOYMENT_PROVIDERS,
  DEPLOYMENT_STATUSES,
  DOMAIN_DNS_PROVIDERS,
  ENV_TARGETS,
  type DeploymentEnvironment,
  type DeploymentProvider,
  type DeploymentStatus,
  type DomainDnsProvider,
  type EnvTarget,
} from "@/lib/deployment/types";

export function deploymentErrorResponse(error: unknown) {
  if (error instanceof DeploymentAuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected Deployment error.";

  let status = 400;
  if (
    message.includes("Authentication required") ||
    message.includes("Unauthorized")
  ) {
    status = 401;
  } else if (message.includes("not found") || message.includes("Not found")) {
    status = 404;
  } else if (message.includes("not implemented")) {
    status = 501;
  }

  console.error("[deployment]", error);
  return NextResponse.json({ error: message }, { status });
}

export function parseDeploymentListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    provider: searchParams.get("provider")?.trim() || undefined,
    projectId: searchParams.get("projectId")?.trim() || undefined,
    environment: searchParams.get("environment")?.trim() || undefined,
    limit:
      typeof limit === "number" && Number.isFinite(limit)
        ? Math.min(Math.max(1, Math.floor(limit)), 500)
        : undefined,
    offset:
      typeof offset === "number" && Number.isFinite(offset)
        ? Math.max(0, Math.floor(offset))
        : undefined,
  };
}

export function parseDeploymentProvider(
  value: unknown,
): DeploymentProvider | null {
  if (typeof value !== "string") return null;
  return DEPLOYMENT_PROVIDERS.includes(value as DeploymentProvider)
    ? (value as DeploymentProvider)
    : null;
}

export function parseDeploymentStatus(value: unknown): DeploymentStatus | null {
  if (typeof value !== "string") return null;
  return DEPLOYMENT_STATUSES.includes(value as DeploymentStatus)
    ? (value as DeploymentStatus)
    : null;
}

export function parseDeploymentEnvironment(
  value: unknown,
): DeploymentEnvironment | null {
  if (typeof value !== "string") return null;
  return DEPLOYMENT_ENVIRONMENTS.includes(value as DeploymentEnvironment)
    ? (value as DeploymentEnvironment)
    : null;
}

export function parseEnvTarget(value: unknown): EnvTarget | null {
  if (typeof value !== "string") return null;
  return ENV_TARGETS.includes(value as EnvTarget)
    ? (value as EnvTarget)
    : null;
}

export function parseDnsProvider(value: unknown): DomainDnsProvider | null {
  if (typeof value !== "string") return null;
  return DOMAIN_DNS_PROVIDERS.includes(value as DomainDnsProvider)
    ? (value as DomainDnsProvider)
    : null;
}
