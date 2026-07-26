import {
  dnsInstructions,
  verifyCnameRecord,
  verifyTxtRecord,
} from "@/lib/deployment/engine/dns";
import {
  generateDomainVerificationToken,
  getSiteByCustomDomain,
  getSiteById,
  updateSite,
} from "@/lib/website/repository";
import type { WebsiteSite } from "@/lib/website/types";

export type DomainSetupInstructions = {
  customDomain: string;
  txtHost: string;
  txtValue: string;
  cnameHost: string;
  cnameValue: string;
  apexNote: string | null;
};

export function appHostnameForDomains(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  if (configured) {
    try {
      return new URL(configured).hostname.toLowerCase();
    } catch {
      // fall through
    }
  }
  return "localhost";
}

export function normalizeCustomDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function isValidCustomDomain(hostname: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
    hostname,
  );
}

export function isApexDomain(hostname: string): boolean {
  const parts = hostname.split(".").filter(Boolean);
  // Treat 2-label hosts as apex (example.com). Multi-part public suffixes
  // still get the apex guidance — operators can use www if needed.
  return parts.length === 2;
}

export function buildDomainInstructions(
  site: WebsiteSite,
): DomainSetupInstructions | null {
  if (!site.customDomain || !site.domainVerificationToken) return null;
  const base = dnsInstructions({
    hostname: site.customDomain,
    verificationToken: site.domainVerificationToken,
    cnameTarget: appHostnameForDomains(),
  });
  return {
    customDomain: site.customDomain,
    txtHost: base.txtHost,
    txtValue: base.txtValue,
    cnameHost: base.cnameHost,
    cnameValue: base.cnameValue || appHostnameForDomains(),
    apexNote: isApexDomain(site.customDomain)
      ? "Apex domains usually cannot use a CNAME. Prefer www.example.com, or point an A/ALIAS record at your hosting provider once SSL is provisioned."
      : null,
  };
}

export function setCustomDomain(
  siteId: string,
  customDomain: string | null,
): WebsiteSite {
  const site = getSiteById(siteId);
  if (!site) throw new Error("Site not found.");

  if (!customDomain) {
    return updateSite(siteId, {
      customDomain: null,
      domainVerified: false,
      domainVerificationToken: null,
    });
  }

  const normalized = normalizeCustomDomain(customDomain);
  if (!isValidCustomDomain(normalized)) {
    throw new Error("Enter a valid domain, e.g. www.example.com.");
  }

  const taken = getSiteByCustomDomain(normalized);
  if (taken && taken.id !== siteId) {
    throw new Error("That custom domain is already in use.");
  }

  const token =
    site.customDomain === normalized && site.domainVerificationToken
      ? site.domainVerificationToken
      : generateDomainVerificationToken();

  return updateSite(siteId, {
    customDomain: normalized,
    domainVerified: false,
    domainVerificationToken: token,
  });
}

export async function verifyCustomDomain(siteId: string): Promise<{
  site: WebsiteSite;
  txtOk: boolean;
  cnameOk: boolean;
  message: string;
  instructions: DomainSetupInstructions | null;
}> {
  const site = getSiteById(siteId);
  if (!site) throw new Error("Site not found.");
  if (!site.customDomain || !site.domainVerificationToken) {
    throw new Error("Set a custom domain before verifying.");
  }

  const expectedToken = site.domainVerificationToken;
  const hostname = site.customDomain;

  const preferredTxt = await verifyTxtRecord({
    hostname,
    expectedToken,
  });
  const rootTxt = preferredTxt.ok
    ? preferredTxt
    : await verifyTxtRecord({
        hostname,
        expectedToken,
        recordHost: hostname,
      });

  if (!rootTxt.ok) {
    return {
      site,
      txtOk: false,
      cnameOk: false,
      message:
        rootTxt.error ||
        preferredTxt.error ||
        "DNS TXT verification failed. Add the record and wait for propagation.",
      instructions: buildDomainInstructions(site),
    };
  }

  const cname = await verifyCnameRecord({
    hostname,
    expectedTarget: appHostnameForDomains(),
  });

  const verified = updateSite(siteId, { domainVerified: true });
  const instructions = buildDomainInstructions(verified);

  return {
    site: verified,
    txtOk: true,
    cnameOk: cname.ok,
    message: cname.ok
      ? "Domain ownership verified and CNAME looks correct."
      : `Ownership verified via TXT. CNAME is not pointing to ${appHostnameForDomains()} yet — update DNS so traffic can reach MABPS.`,
    instructions,
  };
}

export function resolvePublishedSiteByHost(host: string): WebsiteSite | null {
  const hostname = host.split(":")[0]?.toLowerCase();
  if (!hostname) return null;

  const site = getSiteByCustomDomain(hostname);
  if (!site) return null;
  if (site.status !== "published") return null;
  if (!site.domainVerified) return null;
  return site;
}
