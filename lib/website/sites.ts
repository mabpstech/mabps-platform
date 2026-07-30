import {
  assertWithinLimit,
  getWorkspaceUsage,
} from "@/lib/billing/entitlements";
import { setUsageValue } from "@/lib/billing/repository";
import { isPlaceholderSiteName, resolvePublicSiteName } from "@/lib/website/ai/helpers";
import {
  countSitesForWorkspace,
  createSite,
  deleteSite,
  getSiteById,
  listSitesForWorkspace,
  sumWorkspaceMediaBytes,
  updateSite,
} from "@/lib/website/repository";
import type { WebsiteSite } from "@/lib/website/types";
import { removeSiteUploadDir } from "@/lib/website/media-storage";
import { sqlite } from "@/lib/db";

function workspaceDisplayName(workspaceId: string): string | null {
  const row = sqlite
    .prepare(`SELECT "name" FROM "organization" WHERE "id" = ?`)
    .get(workspaceId) as { name: string } | undefined;
  return row?.name?.trim() || null;
}

export function listWorkspaceSites(workspaceId: string): WebsiteSite[] {
  return listSitesForWorkspace(workspaceId);
}

export function createWorkspaceSite(input: {
  workspaceId: string;
  name: string;
  slug?: string;
  template?: import("@/lib/website/templates").SiteTemplateId | null;
  category?: import("@/lib/website/templates").SiteCategoryId | null;
}): WebsiteSite {
  assertWithinLimit(input.workspaceId, "sites", { delta: 1 });
  const renamed = isPlaceholderSiteName(input.name);
  const name = resolvePublicSiteName(
    input.name,
    workspaceDisplayName(input.workspaceId),
  );
  const site = createSite({
    ...input,
    name,
    // Regenerating slug when replacing the forbidden placeholder name.
    slug: renamed ? undefined : input.slug,
  });
  const count = countSitesForWorkspace(input.workspaceId);
  setUsageValue(input.workspaceId, "sites", "lifetime", count);
  return site;
}

export function updateWorkspaceSite(
  siteId: string,
  workspaceId: string,
  input: Parameters<typeof updateSite>[1],
): WebsiteSite {
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspaceId) {
    throw new Error("Site not found.");
  }
  return updateSite(siteId, input);
}

export async function deleteWorkspaceSite(
  siteId: string,
  workspaceId: string,
): Promise<void> {
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspaceId) {
    throw new Error("Site not found.");
  }

  await removeSiteUploadDir(workspaceId, siteId);
  deleteSite(siteId);

  const count = countSitesForWorkspace(workspaceId);
  setUsageValue(workspaceId, "sites", "lifetime", count);

  const bytes = sumWorkspaceMediaBytes(workspaceId);
  const mb = Math.ceil(bytes / (1024 * 1024));
  setUsageValue(workspaceId, "storageMb", "lifetime", mb);
}

export function syncStorageUsage(workspaceId: string): number {
  const bytes = sumWorkspaceMediaBytes(workspaceId);
  const mb = Math.ceil(bytes / (1024 * 1024));
  setUsageValue(workspaceId, "storageMb", "lifetime", mb);
  return getWorkspaceUsage(workspaceId).storageMb;
}

export function assertStorageAvailable(
  workspaceId: string,
  addedBytes: number,
): void {
  if (addedBytes <= 0) return;
  const addedMb = Math.max(1, Math.ceil(addedBytes / (1024 * 1024)));
  assertWithinLimit(workspaceId, "storageMb", { delta: addedMb });
}
