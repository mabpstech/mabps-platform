import {
  generateCommitSha,
  truncateSummary,
} from "@/lib/deployment/defaults";
import { createCloudflareDeployment } from "@/lib/deployment/engine/cloudflare";
import { createVercelDeployment } from "@/lib/deployment/engine/vercel";
import {
  appendBuildLog,
  createDeploymentLog,
  createDeploymentRecord,
  createMonitorEvent,
  ensureWorkspaceDeployment,
  getProjectById,
  listEnvVars,
  pruneOldDeployments,
  updateDeploymentRecord,
  updateProject,
} from "@/lib/deployment/repository";
import type {
  DeploymentEnvironment,
  DeploymentRecord,
  DeploymentTrigger,
} from "@/lib/deployment/types";

export type PublishPipelineResult = {
  deployment: DeploymentRecord;
  simulated: boolean;
};

export async function runPublishPipeline(options: {
  workspaceId: string;
  projectId: string;
  environment?: DeploymentEnvironment;
  trigger?: DeploymentTrigger;
  commitMessage?: string;
  commitSha?: string;
  branch?: string;
  createdByUserId?: string | null;
}): Promise<PublishPipelineResult> {
  const settings = ensureWorkspaceDeployment(options.workspaceId);
  const project = getProjectById(options.workspaceId, options.projectId);
  if (!project) throw new Error("Project not found.");
  if (project.status !== "active") {
    throw new Error("Only active projects can be published.");
  }

  const commitSha = options.commitSha || generateCommitSha();
  const commitMessage =
    options.commitMessage?.trim() ||
    `Publish ${project.name} (${new Date().toISOString()})`;
  const branch = options.branch || project.productionBranch;
  const environment = options.environment || "production";
  const trigger = options.trigger || "manual";
  const envVars = listEnvVars(options.workspaceId, project.id).filter(
    (item) => item.target === environment || item.target === "all",
  );

  let deployment = createDeploymentRecord(options.workspaceId, {
    projectId: project.id,
    status: "queued",
    provider: project.provider,
    environment,
    trigger,
    commitSha,
    commitMessage,
    branch,
    previousDeploymentId: project.currentDeploymentId,
    createdByUserId: options.createdByUserId ?? null,
    metadata: {
      envVarCount: envVars.length,
      framework: project.framework,
    },
  });

  createMonitorEvent(options.workspaceId, {
    type: "deployment_started",
    severity: "info",
    title: "Deployment started",
    message: truncateSummary(commitMessage, 120),
    projectId: project.id,
    deploymentId: deployment.id,
  });

  const startedAt = new Date().toISOString();
  deployment = updateDeploymentRecord(options.workspaceId, deployment.id, {
    status: "building",
    buildStartedAt: startedAt,
  });

  appendBuildLog(
    options.workspaceId,
    deployment.id,
    `Queued publish for ${project.slug} via ${project.provider}`,
  );
  appendBuildLog(
    options.workspaceId,
    deployment.id,
    `Branch ${branch} · commit ${commitSha.slice(0, 8)}`,
  );
  appendBuildLog(
    options.workspaceId,
    deployment.id,
    `Injecting ${envVars.length} environment variable(s) for ${environment}`,
  );
  if (project.buildCommand) {
    appendBuildLog(
      options.workspaceId,
      deployment.id,
      `Running build command: ${project.buildCommand}`,
    );
  } else {
    appendBuildLog(
      options.workspaceId,
      deployment.id,
      "Using provider default build pipeline",
    );
  }

  try {
    let providerResult: {
      providerDeploymentId: string;
      url: string;
      inspectorUrl: string;
      simulated: boolean;
      raw: Record<string, unknown>;
    };

    if (project.provider === "cloudflare") {
      providerResult = await createCloudflareDeployment({
        settings,
        project,
        envVars,
        commitSha,
        commitMessage,
        branch,
      });
    } else if (project.provider === "vercel") {
      providerResult = await createVercelDeployment({
        settings,
        project,
        envVars,
        commitSha,
        commitMessage,
        branch,
      });
    } else {
      providerResult = {
        providerDeploymentId: `manual_${commitSha.slice(0, 12)}`,
        url: `https://${project.slug}.manual.local`,
        inspectorUrl: `/deployment/history`,
        simulated: true,
        raw: { mode: "manual" },
      };
    }

    appendBuildLog(
      options.workspaceId,
      deployment.id,
      providerResult.simulated
        ? "Provider credentials missing — completed simulated deployment"
        : `Provider accepted deployment ${providerResult.providerDeploymentId}`,
    );
    appendBuildLog(
      options.workspaceId,
      deployment.id,
      `Deployment URL: ${providerResult.url}`,
      "info",
    );

    const finishedAt = new Date().toISOString();
    const durationMs =
      new Date(finishedAt).getTime() - new Date(startedAt).getTime();

    deployment = updateDeploymentRecord(options.workspaceId, deployment.id, {
      status: "ready",
      url: providerResult.url,
      inspectorUrl: providerResult.inspectorUrl,
      providerDeploymentId: providerResult.providerDeploymentId,
      buildFinishedAt: finishedAt,
      durationMs,
      metadata: {
        ...deployment.metadata,
        providerRaw: providerResult.raw,
        simulated: providerResult.simulated,
      },
    });

    deployment = updateDeploymentRecord(options.workspaceId, deployment.id, {
      status: "published",
      publishedAt: finishedAt,
    });

    updateProject(options.workspaceId, project.id, {
      currentDeploymentId: deployment.id,
      lastPublishedAt: finishedAt,
    });

    pruneOldDeployments(
      options.workspaceId,
      project.id,
      settings.retentionDeployments,
    );

    appendBuildLog(
      options.workspaceId,
      deployment.id,
      "Publish pipeline completed successfully",
    );

    createDeploymentLog(options.workspaceId, {
      operation: "publish",
      projectId: project.id,
      deploymentId: deployment.id,
      requestSummary: commitMessage,
      responseSummary: providerResult.url,
    });

    createMonitorEvent(options.workspaceId, {
      type: "deployment_published",
      severity: "info",
      title: "Deployment published",
      message: providerResult.url,
      projectId: project.id,
      deploymentId: deployment.id,
    });

    return { deployment, simulated: providerResult.simulated };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Publish pipeline failed.";
    const failedAt = new Date().toISOString();
    const durationMs =
      new Date(failedAt).getTime() - new Date(startedAt).getTime();

    appendBuildLog(options.workspaceId, deployment.id, message, "error");

    deployment = updateDeploymentRecord(options.workspaceId, deployment.id, {
      status: "failed",
      failedAt,
      errorMessage: message,
      buildFinishedAt: failedAt,
      durationMs,
    });

    createDeploymentLog(options.workspaceId, {
      operation: "publish",
      status: "error",
      projectId: project.id,
      deploymentId: deployment.id,
      errorMessage: message,
    });

    createMonitorEvent(options.workspaceId, {
      type: "deployment_failed",
      severity: "critical",
      title: "Deployment failed",
      message,
      projectId: project.id,
      deploymentId: deployment.id,
    });

    throw error;
  }
}
