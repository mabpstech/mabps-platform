import type {
  MarketplaceInstall,
  MarketplaceListing,
  MarketplaceListingVersion,
} from "@/lib/marketplace/types";

export type UpdateAvailability = {
  installId: string;
  listingId: string;
  currentVersion: string;
  latestVersion: string;
  latestVersionId: string;
  available: boolean;
};

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function parseSemver(value: string): [number, number, number] {
  const cleaned = value.trim().replace(/^v/i, "");
  const [major = "0", minor = "0", patch = "0"] = cleaned.split(".");
  return [
    Number.parseInt(major, 10) || 0,
    Number.parseInt(minor, 10) || 0,
    Number.parseInt(patch, 10) || 0,
  ];
}

export function isUpdateAvailable(
  install: MarketplaceInstall,
  listing: MarketplaceListing,
): boolean {
  return compareSemver(listing.latestVersion, install.version) > 0;
}

export function buildUpdateAvailability(
  install: MarketplaceInstall,
  listing: MarketplaceListing,
  latestVersion: MarketplaceListingVersion | null,
): UpdateAvailability {
  const available = isUpdateAvailable(install, listing);
  return {
    installId: install.id,
    listingId: listing.id,
    currentVersion: install.version,
    latestVersion: listing.latestVersion,
    latestVersionId: latestVersion?.id ?? install.versionId,
    available,
  };
}
