import Link from "next/link";
import {
  BillingDashboard,
  type UpgradeRecommendation,
} from "@/components/billing/billing-dashboard";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWorkspace } from "@/lib/auth/workspace";
import {
  featureGateFromSubscription,
  getPlanDisplayName,
  PLAN_IDS,
  PLAN_RANK,
  resolveCurrentPlan,
} from "@/lib/billing/engine";
import type { ResolvedPlan, UpgradePlanId } from "@/lib/billing/engine";
import { getWorkspaceInvoices } from "@/lib/billing/invoices";
import { isStripeConfigured } from "@/lib/billing/stripe";

type BillingPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

function nextUpgradePlan(planId: ResolvedPlan["planId"]): UpgradePlanId | null {
  const next = PLAN_IDS.find(
    (id) => id !== "free" && PLAN_RANK[id] > PLAN_RANK[planId],
  );
  return next && next !== "free" ? next : null;
}

function getUpgradeRecommendation(
  resolved: ResolvedPlan,
): UpgradeRecommendation | null {
  if (resolved.planId === "enterprise") return null;

  const gate = featureGateFromSubscription(resolved.subscription, {
    usage: resolved.usage,
  });

  const gateResults = [
    gate.canCreateAnotherWebsite(),
    gate.canUploadMoreMedia(),
    gate.canUseAutomation(),
    gate.canUseAI(),
    gate.canUseMarketplace(),
  ];

  for (const result of gateResults) {
    if (!result.allowed && result.upgradePlan) {
      return {
        planId: result.upgradePlan,
        planName: getPlanDisplayName(result.upgradePlan),
        reason:
          result.reason ?? "Upgrade to unlock more of the platform.",
      };
    }
  }

  const metricLabels: Record<keyof ResolvedPlan["usageLimits"], string> = {
    members: "members",
    sites: "sites",
    storageMb: "storage",
    aiCredits: "AI credits",
    automations: "automations",
    plugins: "marketplace plugins",
  };

  for (const limit of Object.values(resolved.usageLimits)) {
    if (limit.unlimited || limit.limit <= 0) continue;
    const percent = Math.round((limit.current / limit.limit) * 100);
    if (percent < 80) continue;

    const planId = nextUpgradePlan(resolved.planId);
    if (!planId) return null;

    return {
      planId,
      planName: getPlanDisplayName(planId),
      reason: `You're using ${percent}% of your ${metricLabels[limit.metric]} allowance. Consider upgrading for more capacity.`,
    };
  }

  return null;
}

export default async function WorkspaceBillingPage({
  searchParams,
}: BillingPageProps) {
  const { workspace, role } = await requireWorkspace({
    callbackUrl: "/settings/workspace/billing",
  });
  const params = await searchParams;
  const canManage = isWorkspaceManager(role);
  const resolved = resolveCurrentPlan(workspace.id);
  const upgradeRecommendation = getUpgradeRecommendation(resolved);
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
        resolved={resolved}
        upgradeRecommendation={upgradeRecommendation}
        invoices={invoices}
        canManage={canManage}
        stripeConfigured={isStripeConfigured()}
        checkoutStatus={params.checkout ?? null}
      />
    </div>
  );
}
