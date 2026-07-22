export * from "@/lib/billing/plans";
export * from "@/lib/billing/types";
export {
  ensureFreeSubscription,
  getSubscriptionByWorkspaceId,
  listInvoicesForWorkspace,
} from "@/lib/billing/repository";
export {
  assertWithinLimit,
  canInviteMembers,
  checkLimit,
  getWorkspaceLimits,
  getWorkspacePlanId,
  getWorkspaceUsage,
} from "@/lib/billing/entitlements";
export { isStripeConfigured } from "@/lib/billing/stripe";
export { migrateBillingSchema } from "@/lib/billing/migrate";

/** Gateway-agnostic Billing Engine domain (plans, entitlements, trials, adapters). */
export * as billingEngine from "@/lib/billing/engine";
