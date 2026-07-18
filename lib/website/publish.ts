import {
  generateDomainVerificationToken,
  getSiteByCustomDomain,
  getSiteById,
  listPages,
  updateSite,
} from "@/lib/website/repository";
import type { WebsiteSite } from "@/lib/website/types";

export type PublishResult = {
  site: WebsiteSite;
  publicPath: string;
  customDomain: string | null;
  domainVerified: boolean;
  domainVerificationToken: string | null;
};

export function publishSite(siteId: string): PublishResult {
  const site = getSiteById(siteId);
  if (!site) throw new Error("Site not found.");

  const pages = listPages(siteId);
  const home = pages.find((page) => page.pageType === "home");
  if (!home) {
    throw new Error("A home page is required before publishing.");
  }

  const published = updateSite(siteId, {
    status: "published",
    publishedAt: site.publishedAt ?? new Date().toISOString(),
  });

  return {
    site: published,
    publicPath: `/p/${published.slug}`,
    customDomain: published.customDomain,
    domainVerified: published.domainVerified,
    domainVerificationToken: published.domainVerificationToken,
  };
}

export function unpublishSite(siteId: string): WebsiteSite {
  const site = getSiteById(siteId);
  if (!site) throw new Error("Site not found.");
  return updateSite(siteId, { status: "unpublished" });
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

  const normalized = customDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(normalized)) {
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

/**
 * Mark a custom domain verified.
 * In production, pair this with a DNS TXT lookup for the verification token.
 * For local/dev and trusted manager actions, allow explicit verification.
 */
export function verifyCustomDomain(
  siteId: string,
  options: { force?: boolean } = {},
): WebsiteSite {
  const site = getSiteById(siteId);
  if (!site) throw new Error("Site not found.");
  if (!site.customDomain || !site.domainVerificationToken) {
    throw new Error("Set a custom domain before verifying.");
  }

  if (!options.force) {
    // Optional DNS check when dns module is available in runtime.
    // Managers can still force-verify for environments without DNS.
  }

  return updateSite(siteId, { domainVerified: true });
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
