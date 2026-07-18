import {
  assertWithinLimit,
  getWorkspaceUsage,
} from "@/lib/billing/entitlements";
import { setUsageValue } from "@/lib/billing/repository";
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

export function listWorkspaceSites(workspaceId: string): WebsiteSite[] {
  return listSitesForWorkspace(workspaceId);
}

export function createWorkspaceSite(input: {
  workspaceId: string;
  name: string;
  slug?: string;
}): WebsiteSite {
  assertWithinLimit(input.workspaceId, "sites", { delta: 1 });
  const site = createSite(input);
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

export function deleteWorkspaceSite(
  siteId: string,
  workspaceId: string,
): void {
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspaceId) {
    throw new Error("Site not found.");
  }

  removeSiteUploadDir(workspaceId, siteId);
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
