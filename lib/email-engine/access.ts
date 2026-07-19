import { createModuleAccess } from "@/lib/platform/access";
import { ensureEmailEngineReady } from "@/lib/email-engine/repository";

const access = createModuleAccess({
  errorName: "EmailEngineAuthError",
  ensureReady: ensureEmailEngineReady,
  managerMessage:
    "Only workspace owners and admins can perform this Email Engine action.",
});

export const EmailEngineAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireEmailWorkspace(callbackUrl = "/email") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireEmailMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireEmailManagerApi() {
  return access.requireManagerApi();
}
