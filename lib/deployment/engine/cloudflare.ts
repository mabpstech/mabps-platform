import type {
  DeploymentEnvVar,
  DeploymentProject,
  DeploymentSettings,
} from "@/lib/deployment/types";

export type CloudflareDeployResult = {
  providerDeploymentId: string;
  url: string;
  inspectorUrl: string;
  simulated: boolean;
  raw: Record<string, unknown>;
};

function cloudflareHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Trigger a Cloudflare Pages deployment when credentials are configured.
 * Falls back to simulated deployment for local/dev without tokens.
 */
export async function createCloudflareDeployment(options: {
  settings: DeploymentSettings;
  project: DeploymentProject;
  envVars: DeploymentEnvVar[];
  commitSha: string;
  commitMessage: string;
  branch: string;
}): Promise<CloudflareDeployResult> {
  const { settings, project, commitSha, commitMessage, branch } = options;
  const projectName = project.cloudflareProjectName || project.slug;

  if (!settings.cloudflareApiToken || !settings.cloudflareAccountId) {
    const id = `sim_cf_${commitSha.slice(0, 12)}`;
    return {
      providerDeploymentId: id,
      url: `https://${projectName}.pages.dev`,
      inspectorUrl: `https://dash.cloudflare.com/${settings.cloudflareAccountId || "account"}/pages/view/${projectName}`,
      simulated: true,
      raw: {
        mode: "simulated",
        reason: "Cloudflare account/token not configured.",
        commitMessage,
        branch,
      },
    };
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${settings.cloudflareAccountId}/pages/projects/${projectName}/deployments`,
    {
      method: "POST",
      headers: cloudflareHeaders(settings.cloudflareApiToken),
      body: JSON.stringify({
        branch,
        commit_hash: commitSha,
        commit_message: commitMessage,
      }),
    },
  );

  const raw = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const errors = Array.isArray(raw.errors) ? raw.errors : [];
    const first = errors[0] as { message?: string } | undefined;
    throw new Error(
      first?.message || `Cloudflare API error (${response.status}).`,
    );
  }

  const result = (raw.result || {}) as Record<string, unknown>;
  const id = String(result.id || `cf_${commitSha.slice(0, 12)}`);
  const url =
    typeof result.url === "string"
      ? result.url
      : `https://${projectName}.pages.dev`;

  return {
    providerDeploymentId: id,
    url,
    inspectorUrl: `https://dash.cloudflare.com/${settings.cloudflareAccountId}/pages/view/${projectName}/${id}`,
    simulated: false,
    raw,
  };
}

export async function ensureCloudflareDnsRecord(options: {
  settings: DeploymentSettings;
  hostname: string;
  content: string;
  type?: "CNAME" | "TXT";
}): Promise<{ ok: boolean; message: string; simulated: boolean }> {
  const { settings, hostname, content } = options;
  const type = options.type || "CNAME";

  if (!settings.cloudflareApiToken || !settings.cloudflareZoneId) {
    return {
      ok: true,
      simulated: true,
      message:
        "Cloudflare zone/token not configured — configure DNS manually or add credentials.",
    };
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${settings.cloudflareZoneId}/dns_records`,
    {
      method: "POST",
      headers: cloudflareHeaders(settings.cloudflareApiToken),
      body: JSON.stringify({
        type,
        name: hostname,
        content,
        ttl: 1,
        proxied: type === "CNAME",
      }),
    },
  );

  const raw = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const errors = Array.isArray(raw.errors) ? raw.errors : [];
    const first = errors[0] as { message?: string } | undefined;
    return {
      ok: false,
      simulated: false,
      message: first?.message || `Cloudflare DNS error (${response.status}).`,
    };
  }

  return {
    ok: true,
    simulated: false,
    message: `Created Cloudflare ${type} record for ${hostname}.`,
  };
}

export async function testCloudflareConnection(
  settings: DeploymentSettings,
): Promise<{ ok: boolean; message: string }> {
  if (!settings.cloudflareApiToken || !settings.cloudflareAccountId) {
    return {
      ok: false,
      message: "Cloudflare account ID and API token are required.",
    };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${settings.cloudflareAccountId}/tokens/verify`,
      { headers: cloudflareHeaders(settings.cloudflareApiToken) },
    );
    if (!response.ok) {
      return {
        ok: false,
        message: `Cloudflare auth failed (${response.status}).`,
      };
    }
    return { ok: true, message: "Cloudflare connection OK." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to reach Cloudflare API.",
    };
  }
}
