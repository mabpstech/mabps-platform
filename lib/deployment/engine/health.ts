import {
  createHealthCheck,
  createMonitorEvent,
  ensureWorkspaceDeployment,
  getDeploymentById,
  getProjectById,
  listDomains,
  listHealthChecks,
  listProjects,
} from "@/lib/deployment/repository";
import type {
  DeploymentHealthCheck,
  HealthStatus,
} from "@/lib/deployment/types";

function classifyStatus(httpStatus: number | null, error: string | null): HealthStatus {
  if (error) return "down";
  if (httpStatus == null) return "unknown";
  if (httpStatus >= 200 && httpStatus < 300) return "healthy";
  if (httpStatus >= 300 && httpStatus < 500) return "degraded";
  return "down";
}

export async function runHealthCheck(options: {
  workspaceId: string;
  projectId: string;
  url?: string;
  domainId?: string | null;
}): Promise<DeploymentHealthCheck> {
  const settings = ensureWorkspaceDeployment(options.workspaceId);
  if (!settings.healthChecksEnabled) {
    throw new Error("Health checks are disabled for this workspace.");
  }

  const project = getProjectById(options.workspaceId, options.projectId);
  if (!project) throw new Error("Project not found.");

  let url = options.url;
  let domainId = options.domainId ?? null;

  if (!url) {
    const domains = listDomains(options.workspaceId, {
      projectId: project.id,
      status: "verified",
    });
    const primary = domains.find((d) => d.isPrimary) || domains[0];
    if (primary) {
      url = `https://${primary.hostname}${settings.healthCheckPath}`;
      domainId = primary.id;
    } else if (project.currentDeploymentId) {
      const current = getDeploymentById(
        options.workspaceId,
        project.currentDeploymentId,
      );
      url = current?.url
        ? `${current.url.replace(/\/$/, "")}${settings.healthCheckPath}`
        : undefined;
    }
  }

  if (!url) {
    throw new Error("No verified domain or deployment URL available to check.");
  }

  const started = Date.now();
  let httpStatus: number | null = null;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      settings.healthCheckTimeoutMs,
    );
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "MABPS-HealthCheck/1.0" },
      });
      httpStatus = response.status;
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Health check request failed.";
  }

  const latencyMs = Date.now() - started;
  const status = classifyStatus(httpStatus, errorMessage);

  const check = createHealthCheck(options.workspaceId, {
    projectId: project.id,
    domainId,
    deploymentId: project.currentDeploymentId,
    url,
    status,
    httpStatus,
    latencyMs,
    errorMessage,
  });

  createMonitorEvent(options.workspaceId, {
    type: status === "healthy" ? "health_ok" : "health_down",
    severity:
      status === "healthy" ? "info" : status === "degraded" ? "warning" : "critical",
    title: `Health ${status}`,
    message: `${url} · ${httpStatus ?? "n/a"} · ${latencyMs}ms`,
    projectId: project.id,
    domainId,
    deploymentId: project.currentDeploymentId,
  });

  return check;
}

export async function runWorkspaceHealthChecks(
  workspaceId: string,
): Promise<DeploymentHealthCheck[]> {
  const settings = ensureWorkspaceDeployment(workspaceId);
  if (!settings.healthChecksEnabled) return [];

  const projects = listProjects(workspaceId, { status: "active", limit: 50 });
  const results: DeploymentHealthCheck[] = [];
  const deadline = Date.now() + 60_000;

  for (const project of projects) {
    if (Date.now() > deadline) break;
    try {
      results.push(
        await runHealthCheck({
          workspaceId,
          projectId: project.id,
        }),
      );
    } catch {
      // Skip projects without a reachable URL.
    }
  }

  return results;
}

export function getRecentHealth(
  workspaceId: string,
  projectId?: string,
): DeploymentHealthCheck[] {
  return listHealthChecks(workspaceId, { projectId, limit: 50 });
}
