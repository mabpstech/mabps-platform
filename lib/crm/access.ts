import { createModuleAccess } from "@/lib/platform/access";
import { ensureCrmReady } from "@/lib/crm/repository";

const access = createModuleAccess({
  errorName: "CrmAuthError",
  ensureReady: ensureCrmReady,
  managerMessage:
    "Only workspace owners and admins can perform this CRM action.",
});

export const CrmAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireCrmWorkspace(callbackUrl = "/crm") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireCrmMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireCrmManagerApi() {
  return access.requireManagerApi();
}
