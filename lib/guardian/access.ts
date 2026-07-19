import { createModuleAccess } from "@/lib/platform/access";
import { ensureGuardianReady } from "@/lib/guardian/repository";

const access = createModuleAccess({
  errorName: "GuardianAuthError",
  ensureReady: ensureGuardianReady,
  managerMessage:
    "Only workspace owners and admins can perform this Guardian action.",
});

export const GuardianAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireGuardianWorkspace(callbackUrl = "/guardian") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireGuardianMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireGuardianManagerApi() {
  return access.requireManagerApi();
}
