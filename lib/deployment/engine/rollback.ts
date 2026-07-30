import {
  appendBuildLog,
  createDeploymentLog,
  createDeploymentRecord,
  createMonitorEvent,
  getDeploymentById,
  getProjectById,
  updateDeploymentRecord,
  updateProject,
} from "@/lib/deployment/repository";
import type { DeploymentRecord } from "@/lib/deployment/types";

export type RollbackResult = {
  deployment: DeploymentRecord;
  previous: DeploymentRecord;
};

/**
 * Roll back a project to a previous successful deployment.
 * Creates a new deployment record pointing at the prior release.
 */
export async function rollbackDeployment(options: {
  workspaceId: string;
  deploymentId: string;
  createdByUserId?: string | null;
}): Promise<RollbackResult> {
  const target = getDeploymentById(options.workspaceId, options.deploymentId);
  if (!target) throw new Error("Deployment not found.");
  if (target.status !== "published" && target.status !== "ready") {
    throw new Error("Only ready or published deployments can be rolled back to.");
  }

  const project = getProjectById(options.workspaceId, target.projectId);
  if (!project) throw new Error("Project not found.");

  const currentId = project.currentDeploymentId;
  if (currentId === target.id) {
    throw new Error("This deployment is already the current production release.");
  }

  const previous = currentId
    ? getDeploymentById(options.workspaceId, currentId)
    : null;

  const startedAt = new Date().toISOString();
  let deployment = createDeploymentRecord(options.workspaceId, {
    projectId: project.id,
    status: "building",
    provider: project.provider,
    environment: "production",
    trigger: "rollback",
    commitSha: target.commitSha,
    commitMessage: `Rollback to ${target.commitSha?.slice(0, 8) || target.id.slice(0, 8)}`,
    branch: target.branch,
    previousDeploymentId: currentId,
    isRollback: true,
    rolledBackFromId: currentId,
    createdByUserId: options.createdByUserId ?? null,
    metadata: {
      rollbackTargetId: target.id,
      rollbackTargetUrl: target.url,
    },
  });

  updateDeploymentRecord(options.workspaceId, deployment.id, {
    buildStartedAt: startedAt,
  });

  appendBuildLog(
    options.workspaceId,
    deployment.id,
    `Rolling back to deployment ${target.id}`,
  );
  appendBuildLog(
    options.workspaceId,
    deployment.id,
    `Restoring URL ${target.url || "(none)"}`,
  );

  const finishedAt = new Date().toISOString();
  deployment = updateDeploymentRecord(options.workspaceId, deployment.id, {
    status: "published",
    url: target.url,
    inspectorUrl: target.inspectorUrl,
    providerDeploymentId: target.providerDeploymentId,
    buildFinishedAt: finishedAt,
    publishedAt: finishedAt,
    durationMs:
      new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
  });

  if (previous) {
    updateDeploymentRecord(options.workspaceId, previous.id, {
      status: "rolled_back",
    });
  }

  updateProject(options.workspaceId, project.id, {
    currentDeploymentId: deployment.id,
    lastPublishedAt: finishedAt,
  });

  appendBuildLog(
    options.workspaceId,
    deployment.id,
    "Local deployment pointer updated. Promote/alias the prior release in Vercel or Cloudflare if live traffic must follow this rollback.",
    "warn",
  );

  appendBuildLog(
    options.workspaceId,
    deployment.id,
    "Rollback completed successfully",
  );

  createDeploymentLog(options.workspaceId, {
    operation: "rollback",
    projectId: project.id,
    deploymentId: deployment.id,
    requestSummary: target.id,
    responseSummary: deployment.url,
  });

  createMonitorEvent(options.workspaceId, {
    type: "rollback",
    severity: "warning",
    title: "Deployment rolled back",
    message: `Restored ${target.url || target.id}`,
    projectId: project.id,
    deploymentId: deployment.id,
  });

  return { deployment, previous: target };
}
