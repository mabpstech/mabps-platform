import Link from "next/link";
import { BillingDashboard } from "@/components/billing/billing-dashboard";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWorkspace } from "@/lib/auth/workspace";
import {
  getWorkspaceLimits,
  getWorkspaceUsage,
} from "@/lib/billing/entitlements";
import { getWorkspaceInvoices } from "@/lib/billing/invoices";
import { ensureFreeSubscription } from "@/lib/billing/repository";
import { isStripeConfigured } from "@/lib/billing/stripe";

type BillingPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function WorkspaceBillingPage({
  searchParams,
}: BillingPageProps) {
  const { workspace, role } = await requireWorkspace({
    callbackUrl: "/settings/workspace/billing",
  });
  const params = await searchParams;
  const canManage = isWorkspaceManager(role);
  const subscription = ensureFreeSubscription(workspace.id);
  const usage = getWorkspaceUsage(workspace.id);
  const limits = getWorkspaceLimits(workspace.id);
  const invoices = canManage
    ? await getWorkspaceInvoices(workspace.id, { refresh: true })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Billing
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Subscription, usage limits, and invoices for {workspace.name}.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            href="/settings/workspace"
            className="text-zinc-700 underline-offset-2 hover:underline"
          >
            Workspace
          </Link>
          <Link
            href="/settings/workspace/members"
            className="text-zinc-700 underline-offset-2 hover:underline"
          >
            Members
          </Link>
        </div>
      </div>

      <BillingDashboard
        subscription={subscription}
        usage={usage}
        limits={limits}
        invoices={invoices}
        canManage={canManage}
        stripeConfigured={isStripeConfigured()}
        checkoutStatus={params.checkout ?? null}
      />
    </div>
  );
}
