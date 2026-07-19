import { comparePlans, type PlanId, isPlanId } from "@/lib/billing/plans";
import { assertWithinLimit, getWorkspacePlanId } from "@/lib/billing/entitlements";
import { setUsageValue } from "@/lib/billing/repository";
import {
  intersectPermissions,
  normalizePermissions,
} from "@/lib/marketplace/engine/permissions";
import { executeInSandbox } from "@/lib/marketplace/engine/sandbox";
import { isUpdateAvailable } from "@/lib/marketplace/engine/updates";
import type {
  MarketplaceInstall,
  MarketplaceInstallWithListing,
  MarketplaceListing,
  MarketplaceListingVersion,
  PluginPermission,
} from "@/lib/marketplace/types";

export type InstallDeps = {
  getListingById: (listingId: string) => MarketplaceListing | null;
  getLatestVersion: (
    listingId: string,
  ) => MarketplaceListingVersion | null;
  getVersionById: (versionId: string) => MarketplaceListingVersion | null;
  getInstallByWorkspaceListing: (
    workspaceId: string,
    listingId: string,
  ) => MarketplaceInstall | null;
  insertInstall: (input: {
    workspaceId: string;
    listingId: string;
    versionId: string;
    version: string;
    grantedPermissions: PluginPermission[];
    config: Record<string, unknown>;
    installedByUserId: string | null;
  }) => MarketplaceInstall;
  updateInstallRecord: (
    workspaceId: string,
    installId: string,
    patch: Partial<{
      status: MarketplaceInstall["status"];
      enabled: boolean;
      versionId: string;
      version: string;
      config: Record<string, unknown>;
      grantedPermissions: PluginPermission[];
      lastError: string | null;
      disabledAt: string | null;
    }>,
  ) => MarketplaceInstall;
  deleteInstallRecord: (workspaceId: string, installId: string) => void;
  incrementDownloads: (listingId: string) => void;
  hasCompletedPurchase: (workspaceId: string, listingId: string) => boolean;
  createCompletedPurchase: (input: {
    workspaceId: string;
    listingId: string;
    pricingModel: MarketplaceListing["pricingModel"];
    amountCents: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }) => void;
  recordSandboxRun: (input: {
    workspaceId: string;
    installId: string | null;
    listingId: string | null;
    hook: string;
    result: ReturnType<typeof executeInSandbox>;
  }) => void;
  countEnabledInstalls: (workspaceId: string) => number;
  listInstallsWithListings: (
    workspaceId: string,
  ) => MarketplaceInstallWithListing[];
};

export function syncPluginUsage(
  deps: Pick<InstallDeps, "countEnabledInstalls">,
  workspaceId: string,
): void {
  setUsageValue(
    workspaceId,
    "plugins",
    "lifetime",
    deps.countEnabledInstalls(workspaceId),
  );
}

export function assertListingInstallable(
  workspaceId: string,
  listing: MarketplaceListing,
  deps: Pick<InstallDeps, "hasCompletedPurchase" | "createCompletedPurchase">,
): void {
  if (listing.status !== "published") {
    throw new Error("Listing is not published.");
  }

  const planId = getWorkspacePlanId(workspaceId);
  const minPlan = isPlanId(listing.minPlanId) ? listing.minPlanId : "free";
  if (comparePlans(planId, minPlan as PlanId) < 0) {
    throw new Error(
      `This listing requires the ${minPlan} plan or higher. Upgrade to continue.`,
    );
  }

  if (listing.pricingModel === "free") {
    return;
  }

  if (deps.hasCompletedPurchase(workspaceId, listing.id)) {
    return;
  }

  // Local billing bridge: mark purchase completed when plan allows paid installs.
  // Stripe PaymentIntent wiring can replace this with a real charge later.
  deps.createCompletedPurchase({
    workspaceId,
    listingId: listing.id,
    pricingModel: listing.pricingModel,
    amountCents: listing.priceCents,
    currency: listing.currency,
    metadata: {
      source: "marketplace_billing_bridge",
      planId,
    },
  });
}

export function installListing(
  deps: InstallDeps,
  input: {
    workspaceId: string;
    listingId: string;
    userId?: string | null;
    config?: Record<string, unknown>;
    permissions?: PluginPermission[];
  },
): MarketplaceInstall {
  const listing = deps.getListingById(input.listingId);
  if (!listing) {
    throw new Error("Listing not found.");
  }

  const existing = deps.getInstallByWorkspaceListing(
    input.workspaceId,
    listing.id,
  );
  if (existing) {
    throw new Error("Listing is already installed for this workspace.");
  }

  assertListingInstallable(input.workspaceId, listing, deps);
  assertWithinLimit(input.workspaceId, "plugins", { delta: 1 });

  const version = deps.getLatestVersion(listing.id);
  if (!version) {
    throw new Error("No published version found for listing.");
  }

  const grantedPermissions = intersectPermissions(
    normalizePermissions(input.permissions ?? listing.permissions),
    listing.permissions,
  );

  const install = deps.insertInstall({
    workspaceId: input.workspaceId,
    listingId: listing.id,
    versionId: version.id,
    version: version.version,
    grantedPermissions,
    config: input.config ?? {},
    installedByUserId: input.userId ?? null,
  });

  deps.incrementDownloads(listing.id);

  const sandbox = executeInSandbox({
    workspaceId: input.workspaceId,
    install,
    listing,
    hook: "on_install",
    input: { config: install.config },
  });
  deps.recordSandboxRun({
    workspaceId: input.workspaceId,
    installId: install.id,
    listingId: listing.id,
    hook: "on_install",
    result: sandbox,
  });

  if (sandbox.status === "failed" || sandbox.status === "denied") {
    deps.updateInstallRecord(input.workspaceId, install.id, {
      status: "failed",
      enabled: false,
      lastError: sandbox.errorMessage,
      disabledAt: new Date().toISOString(),
    });
    throw new Error(sandbox.errorMessage ?? "Plugin install sandbox failed.");
  }

  syncPluginUsage(deps, input.workspaceId);
  return deps.updateInstallRecord(input.workspaceId, install.id, {
    status: "installed",
    enabled: true,
    lastError: null,
    disabledAt: null,
  });
}

export function uninstallListing(
  deps: InstallDeps,
  input: { workspaceId: string; installId: string },
): void {
  const installs = deps.listInstallsWithListings(input.workspaceId);
  const current = installs.find((row) => row.id === input.installId);
  if (!current) {
    throw new Error("Install not found.");
  }

  const sandbox = executeInSandbox({
    workspaceId: input.workspaceId,
    install: current,
    listing: current.listing,
    hook: "on_uninstall",
  });
  deps.recordSandboxRun({
    workspaceId: input.workspaceId,
    installId: current.id,
    listingId: current.listingId,
    hook: "on_uninstall",
    result: sandbox,
  });

  deps.deleteInstallRecord(input.workspaceId, current.id);
  syncPluginUsage(deps, input.workspaceId);
}

export function setInstallEnabled(
  deps: InstallDeps,
  input: { workspaceId: string; installId: string; enabled: boolean },
): MarketplaceInstall {
  const installs = deps.listInstallsWithListings(input.workspaceId);
  const current = installs.find((row) => row.id === input.installId);
  if (!current) {
    throw new Error("Install not found.");
  }

  if (input.enabled && !current.enabled) {
    assertWithinLimit(input.workspaceId, "plugins", { delta: 1 });
  }

  const updated = deps.updateInstallRecord(input.workspaceId, current.id, {
    enabled: input.enabled,
    status: input.enabled ? "installed" : "disabled",
    disabledAt: input.enabled ? null : new Date().toISOString(),
    lastError: null,
  });
  syncPluginUsage(deps, input.workspaceId);
  return updated;
}

export function updateInstallVersion(
  deps: InstallDeps,
  input: {
    workspaceId: string;
    installId: string;
    versionId?: string;
  },
): MarketplaceInstall {
  const installs = deps.listInstallsWithListings(input.workspaceId);
  const current = installs.find((row) => row.id === input.installId);
  if (!current) {
    throw new Error("Install not found.");
  }

  const target = input.versionId
    ? deps.getVersionById(input.versionId)
    : deps.getLatestVersion(current.listingId);

  if (!target || target.listingId !== current.listingId) {
    throw new Error("Target version not found.");
  }

  if (
    !input.versionId &&
    !isUpdateAvailable(current, current.listing)
  ) {
    throw new Error("Install is already on the latest version.");
  }

  return deps.updateInstallRecord(input.workspaceId, current.id, {
    versionId: target.id,
    version: target.version,
    lastError: null,
    status: current.enabled ? "installed" : current.status,
  });
}
