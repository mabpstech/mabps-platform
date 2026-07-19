import {
  defaultCnameTarget,
  generateVerificationToken,
  isValidHostname,
  normalizeHostname,
} from "@/lib/deployment/defaults";
import { dnsInstructions, verifyTxtRecord } from "@/lib/deployment/engine/dns";
import { ensureCloudflareDnsRecord } from "@/lib/deployment/engine/cloudflare";
import { provisionSsl } from "@/lib/deployment/engine/ssl";
import {
  createDomain,
  createDeploymentLog,
  createMonitorEvent,
  deleteDomain,
  ensureWorkspaceDeployment,
  getDomainById,
  getProjectById,
  listDomains,
  updateDomain,
} from "@/lib/deployment/repository";
import type {
  DeploymentDomain,
  DomainDnsProvider,
} from "@/lib/deployment/types";

export type DomainSetupResult = {
  domain: DeploymentDomain;
  instructions: ReturnType<typeof dnsInstructions>;
};

export function addCustomDomain(options: {
  workspaceId: string;
  projectId: string;
  hostname: string;
  isPrimary?: boolean;
  dnsProvider?: DomainDnsProvider;
}): DomainSetupResult {
  const settings = ensureWorkspaceDeployment(options.workspaceId);
  const project = getProjectById(options.workspaceId, options.projectId);
  if (!project) throw new Error("Project not found.");

  const hostname = normalizeHostname(options.hostname);
  if (!isValidHostname(hostname)) {
    throw new Error("Enter a valid domain, e.g. www.example.com.");
  }

  const token = generateVerificationToken();
  const cnameTarget = defaultCnameTarget(project.provider);
  const dnsProvider = options.dnsProvider ?? "manual";

  const domain = createDomain(options.workspaceId, {
    projectId: options.projectId,
    hostname,
    isPrimary: options.isPrimary,
    verificationToken: token,
    dnsProvider,
    cnameTarget,
    sslProvider: settings.autoSslEnabled ? "auto" : "custom",
  });

  createDeploymentLog(options.workspaceId, {
    operation: "domain.add",
    projectId: options.projectId,
    requestSummary: hostname,
    responseSummary: `Verification token issued (${dnsProvider}).`,
  });

  createMonitorEvent(options.workspaceId, {
    type: "settings_updated",
    severity: "info",
    title: "Domain added",
    message: `${hostname} awaiting DNS verification.`,
    projectId: options.projectId,
    domainId: domain.id,
  });

  return {
    domain,
    instructions: dnsInstructions({
      hostname,
      verificationToken: token,
      cnameTarget,
    }),
  };
}

export async function verifyDomain(options: {
  workspaceId: string;
  domainId: string;
  force?: boolean;
}): Promise<{
  domain: DeploymentDomain;
  dnsOk: boolean;
  dnsError: string | null;
}> {
  const settings = ensureWorkspaceDeployment(options.workspaceId);
  const domain = getDomainById(options.workspaceId, options.domainId);
  if (!domain) throw new Error("Domain not found.");

  updateDomain(options.workspaceId, domain.id, { status: "verifying" });

  let dnsOk = Boolean(options.force);
  let dnsError: string | null = null;

  if (!options.force && settings.autoDnsVerifyEnabled) {
    const check = await verifyTxtRecord({
      hostname: domain.hostname,
      expectedToken: domain.verificationToken,
    });
    dnsOk = check.ok;
    dnsError = check.error;
  } else if (options.force) {
    dnsError = null;
  }

  const now = new Date().toISOString();

  if (!dnsOk) {
    const failed = updateDomain(options.workspaceId, domain.id, {
      status: "failed",
      lastDnsCheckAt: now,
      lastDnsError: dnsError,
    });

    createDeploymentLog(options.workspaceId, {
      operation: "domain.verify",
      status: "error",
      projectId: domain.projectId,
      requestSummary: domain.hostname,
      errorMessage: dnsError,
    });

    createMonitorEvent(options.workspaceId, {
      type: "domain_failed",
      severity: "warning",
      title: "Domain verification failed",
      message: dnsError,
      projectId: domain.projectId,
      domainId: domain.id,
    });

    return { domain: failed, dnsOk: false, dnsError };
  }

  let verified = updateDomain(options.workspaceId, domain.id, {
    status: "verified",
    verifiedAt: now,
    lastDnsCheckAt: now,
    lastDnsError: null,
  });

  if (settings.autoSslEnabled) {
    verified = await provisionSsl({
      workspaceId: options.workspaceId,
      domain: verified,
      autoSslEnabled: true,
    });
    createMonitorEvent(options.workspaceId, {
      type: "ssl_active",
      severity: "info",
      title: "SSL active",
      message: `Certificate provisioned for ${verified.hostname}.`,
      projectId: verified.projectId,
      domainId: verified.id,
    });
  }

  if (verified.dnsProvider === "cloudflare" && verified.cnameTarget) {
    await ensureCloudflareDnsRecord({
      settings,
      hostname: verified.hostname,
      content: verified.cnameTarget,
      type: "CNAME",
    });
  }

  createDeploymentLog(options.workspaceId, {
    operation: "domain.verify",
    projectId: verified.projectId,
    requestSummary: verified.hostname,
    responseSummary: options.force
      ? "Force-verified by manager."
      : "DNS TXT verified.",
  });

  createMonitorEvent(options.workspaceId, {
    type: "domain_verified",
    severity: "info",
    title: "Domain verified",
    message: verified.hostname,
    projectId: verified.projectId,
    domainId: verified.id,
  });

  return { domain: verified, dnsOk: true, dnsError: null };
}

export function removeDomain(options: {
  workspaceId: string;
  domainId: string;
}): void {
  const domain = getDomainById(options.workspaceId, options.domainId);
  if (!domain) throw new Error("Domain not found.");
  deleteDomain(options.workspaceId, options.domainId);
  createDeploymentLog(options.workspaceId, {
    operation: "domain.remove",
    projectId: domain.projectId,
    requestSummary: domain.hostname,
  });
}

export function getDomainVerificationInstructions(
  workspaceId: string,
  domainId: string,
) {
  const domain = getDomainById(workspaceId, domainId);
  if (!domain) throw new Error("Domain not found.");
  return {
    domain,
    instructions: dnsInstructions({
      hostname: domain.hostname,
      verificationToken: domain.verificationToken,
      cnameTarget: domain.cnameTarget,
    }),
  };
}

export function listProjectDomains(workspaceId: string, projectId?: string) {
  return listDomains(workspaceId, { projectId });
}
