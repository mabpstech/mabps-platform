import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWorkspace } from "@/lib/auth/workspace";
import { createModuleAccess } from "@/lib/platform/access";
import { ensureFreeSubscription } from "@/lib/billing/repository";

const access = createModuleAccess({
  errorName: "BillingAuthError",
  managerMessage: "Only workspace owners and admins can manage billing.",
  enrich: ({ workspace }) => ({
    subscription: ensureFreeSubscription(workspace.id),
  }),
});

export const BillingAuthError = access.AuthError;

/**
 * Require an authenticated workspace manager for billing page renders.
 */
export async function requireBillingManager(
  callbackUrl = "/settings/workspace/billing",
) {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
    managersOnly: true,
  });

  if (!isWorkspaceManager(role)) {
    throw new BillingAuthError(
      "Only workspace owners and admins can manage billing.",
    );
  }

  const subscription = ensureFreeSubscription(workspace.id);
  return { session, workspace, role, subscription };
}

/** Any authenticated workspace member (read entitlements / usage). */
export async function requireBillingMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only (checkout, cancel, portal, invoices). */
export async function requireBillingManagerApi() {
  return access.requireManagerApi();
}
