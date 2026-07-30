import { fetchWithTimeout } from "@/lib/platform/fetch-timeout";
import type { DeploymentEnvVar, DeploymentProject, DeploymentSettings } from "@/lib/deployment/types";

export type VercelDeployResult = {
  providerDeploymentId: string;
  url: string;
  inspectorUrl: string;
  simulated: boolean;
  raw: Record<string, unknown>;
};

function vercelHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Create a Vercel deployment when a token is configured.
 * Fails loudly when the token is missing — never simulates publish.
 */
export async function createVercelDeployment(options: {
  settings: DeploymentSettings;
  project: DeploymentProject;
  envVars: DeploymentEnvVar[];
  commitSha: string;
  commitMessage: string;
  branch: string;
}): Promise<VercelDeployResult> {
  const { settings, project, commitSha, commitMessage, branch } = options;

  if (!settings.vercelToken) {
    throw new Error("Vercel token is not configured.");
  }

  const teamQuery = settings.vercelTeamId
    ? `?teamId=${encodeURIComponent(settings.vercelTeamId)}`
    : "";

  const body = {
    name: project.vercelProjectId || project.slug,
    project: project.vercelProjectId || project.slug,
    target: "production",
    gitSource: {
      type: "github",
      ref: branch,
      sha: commitSha,
    },
    meta: {
      commitMessage,
      mabpsProjectId: project.id,
    },
  };

  const response = await fetchWithTimeout(
    `https://api.vercel.com/v13/deployments${teamQuery}`,
    {
      method: "POST",
      headers: vercelHeaders(settings.vercelToken),
      body: JSON.stringify(body),
      timeoutMs: 45_000,
    },
  );

  const raw = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message =
      typeof raw.error === "object" &&
      raw.error &&
      "message" in raw.error &&
      typeof (raw.error as { message?: unknown }).message === "string"
        ? (raw.error as { message: string }).message
        : `Vercel API error (${response.status}).`;
    throw new Error(message);
  }

  const id = String(raw.id || raw.uid || "");
  const urlHost = typeof raw.url === "string" ? raw.url : `${project.slug}.vercel.app`;
  return {
    providerDeploymentId: id || `vercel_${commitSha.slice(0, 12)}`,
    url: urlHost.startsWith("http") ? urlHost : `https://${urlHost}`,
    inspectorUrl:
      typeof raw.inspectorUrl === "string"
        ? raw.inspectorUrl
        : `https://vercel.com/deployments/${id}`,
    simulated: false,
    raw,
  };
}

export async function testVercelConnection(
  settings: DeploymentSettings,
): Promise<{ ok: boolean; message: string }> {
  if (!settings.vercelToken) {
    return { ok: false, message: "Vercel token is not configured." };
  }

  const teamQuery = settings.vercelTeamId
    ? `?teamId=${encodeURIComponent(settings.vercelTeamId)}`
    : "";

  try {
    const response = await fetchWithTimeout(
      `https://api.vercel.com/v2/user${teamQuery}`,
      {
        headers: vercelHeaders(settings.vercelToken),
        timeoutMs: 15_000,
      },
    );
    if (!response.ok) {
      return {
        ok: false,
        message: `Vercel auth failed (${response.status}).`,
      };
    }
    return { ok: true, message: "Vercel connection OK." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to reach Vercel API.",
    };
  }
}
