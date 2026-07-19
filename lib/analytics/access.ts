import { createModuleAccess } from "@/lib/platform/access";
import { ensureAnalyticsReady } from "@/lib/analytics/repository";

const access = createModuleAccess({
  errorName: "AnalyticsAuthError",
  ensureReady: ensureAnalyticsReady,
  managerMessage:
    "Only workspace owners and admins can perform this Analytics action.",
});

export const AnalyticsAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireAnalyticsWorkspace(callbackUrl = "/analytics") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireAnalyticsMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireAnalyticsManagerApi() {
  return access.requireManagerApi();
}
