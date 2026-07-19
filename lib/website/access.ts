import { createModuleAccess } from "@/lib/platform/access";
import { ensureWebsiteReady, getSiteById } from "@/lib/website/repository";
import type { WebsiteSite } from "@/lib/website/types";

const access = createModuleAccess({
  errorName: "WebsiteAuthError",
  ensureReady: ensureWebsiteReady,
  managerMessage:
    "Only workspace owners and admins can manage the website builder.",
});

export const WebsiteAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireWebsiteWorkspace(callbackUrl = "/website") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireWebsiteMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only (create site, publish, delete). */
export async function requireWebsiteManagerApi() {
  return access.requireManagerApi();
}

/** Load a site and ensure it belongs to the active workspace. */
export async function requireSiteForWorkspace(
  siteId: string,
  workspaceId: string,
): Promise<WebsiteSite> {
  ensureWebsiteReady();
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspaceId) {
    throw new WebsiteAuthError("Site not found.", 404);
  }
  return site;
}
