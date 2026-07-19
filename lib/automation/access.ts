import { createModuleAccess } from "@/lib/platform/access";
import { ensureAutomationReady } from "@/lib/automation/repository";

const access = createModuleAccess({
  errorName: "AutomationAuthError",
  ensureReady: ensureAutomationReady,
  managerMessage:
    "Only workspace owners and admins can perform this Automation action.",
});

export const AutomationAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireAutomationWorkspace(callbackUrl = "/automation") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireAutomationMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireAutomationManagerApi() {
  return access.requireManagerApi();
}
