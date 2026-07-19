import { createModuleAccess } from "@/lib/platform/access";
import { ensureMarketplaceReady } from "@/lib/marketplace/repository";

const access = createModuleAccess({
  errorName: "MarketplaceAuthError",
  ensureReady: ensureMarketplaceReady,
  managerMessage:
    "Only workspace owners and admins can perform this Marketplace action.",
});

export const MarketplaceAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireMarketplaceWorkspace(callbackUrl = "/marketplace") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireMarketplaceMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireMarketplaceManagerApi() {
  return access.requireManagerApi();
}
