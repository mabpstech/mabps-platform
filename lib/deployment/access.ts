import { createModuleAccess } from "@/lib/platform/access";
import { ensureDeploymentReady } from "@/lib/deployment/repository";

const access = createModuleAccess({
  errorName: "DeploymentAuthError",
  ensureReady: ensureDeploymentReady,
  managerMessage:
    "Only workspace owners and admins can perform this Deployment action.",
});

export const DeploymentAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireDeploymentWorkspace(callbackUrl = "/deployment") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireDeploymentMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireDeploymentManagerApi() {
  return access.requireManagerApi();
}
