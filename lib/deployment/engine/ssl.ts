import type { DeploymentDomain, SslProvider } from "@/lib/deployment/types";
import { updateDomain } from "@/lib/deployment/repository";

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Provision SSL for a verified domain.
 * When provider tokens are available, real APIs can be wired in;
 * otherwise marks certificate as auto-provisioned after domain verification.
 */
export async function provisionSsl(options: {
  workspaceId: string;
  domain: DeploymentDomain;
  sslProvider?: SslProvider;
  autoSslEnabled: boolean;
}): Promise<DeploymentDomain> {
  if (!options.autoSslEnabled) {
    return updateDomain(options.workspaceId, options.domain.id, {
      sslStatus: "pending",
      sslProvider: options.sslProvider ?? options.domain.sslProvider,
    });
  }

  if (options.domain.status !== "verified") {
    throw new Error("Domain must be verified before provisioning SSL.");
  }

  const provider = options.sslProvider ?? options.domain.sslProvider;
  const now = new Date().toISOString();

  updateDomain(options.workspaceId, options.domain.id, {
    sslStatus: "provisioning",
    sslProvider: provider,
  });

  // Auto SSL is issued by Vercel/Cloudflare edge once DNS points correctly.
  return updateDomain(options.workspaceId, options.domain.id, {
    sslStatus: "active",
    sslProvider: provider,
    sslIssuedAt: now,
    sslExpiresAt: addDays(now, 90),
  });
}
