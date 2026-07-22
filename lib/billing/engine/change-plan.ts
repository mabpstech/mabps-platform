import {
  comparePlans,
  getPlan,
  getPlanDisplayName,
  isBillingInterval,
  isPlanId,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/engine/plans";
import { findBlockingUsageMetrics } from "@/lib/billing/engine/limits";
import type {
  PlanChangeKind,
  PlanChangePreparation,
  Subscription,
} from "@/lib/billing/engine/types";
import type { UsageSnapshot } from "@/lib/billing/types";

export type PreparePlanChangeInput = {
  subscription: Pick<
    Subscription,
    "planId" | "interval" | "providerSubscriptionId" | "cancelAtPeriodEnd"
  >;
  targetPlanId: PlanId;
  targetInterval: BillingInterval;
  /** Current usage — required to flag downgrade blockers. */
  usage: UsageSnapshot;
};

/**
 * Pure upgrade / downgrade preparation.
 * Does not call any payment provider — adapters consume this later.
 */
export function preparePlanChange(
  input: PreparePlanChangeInput,
): PlanChangePreparation {
  if (!isPlanId(input.targetPlanId) || !isBillingInterval(input.targetInterval)) {
    throw new Error("Invalid plan or interval.");
  }

  const fromPlanId = input.subscription.planId;
  const toPlanId = input.targetPlanId;
  const fromInterval = input.subscription.interval;
  const toInterval = input.targetInterval;

  const samePlan =
    fromPlanId === toPlanId &&
    fromInterval === toInterval &&
    !input.subscription.cancelAtPeriodEnd;

  if (samePlan) {
    return {
      kind: "noop",
      fromPlanId,
      toPlanId,
      fromInterval,
      toInterval,
      requiresCheckout: false,
      requiresProviderUpdate: false,
      canApplyImmediately: true,
      blockingMetrics: [],
      message: "Already on the selected plan.",
    };
  }

  const kind = classifyPlanChange(fromPlanId, toPlanId);
  const targetLimits = getPlan(toPlanId).limits;
  const blockingMetrics =
    kind === "downgrade" || kind === "to_free"
      ? findBlockingUsageMetrics(targetLimits, input.usage)
      : [];

  const hasProviderSubscription = Boolean(
    input.subscription.providerSubscriptionId,
  );
  const requiresCheckout =
    (kind === "from_free" || !hasProviderSubscription) && toPlanId !== "free";
  const requiresProviderUpdate =
    !requiresCheckout && toPlanId !== "free" && hasProviderSubscription;

  return {
    kind,
    fromPlanId,
    toPlanId,
    fromInterval,
    toInterval,
    requiresCheckout,
    requiresProviderUpdate,
    canApplyImmediately: blockingMetrics.length === 0,
    blockingMetrics,
    message: buildChangeMessage({
      kind,
      fromPlanId,
      toPlanId,
      blockingMetrics,
      requiresCheckout,
    }),
  };
}

export function prepareUpgrade(
  input: PreparePlanChangeInput,
): PlanChangePreparation {
  const prepared = preparePlanChange(input);
  if (prepared.kind !== "upgrade" && prepared.kind !== "from_free") {
    throw new Error(
      `Expected an upgrade toward ${getPlanDisplayName(input.targetPlanId)}, got ${prepared.kind}.`,
    );
  }
  return prepared;
}

export function prepareDowngrade(
  input: PreparePlanChangeInput,
): PlanChangePreparation {
  const prepared = preparePlanChange(input);
  if (prepared.kind !== "downgrade" && prepared.kind !== "to_free") {
    throw new Error(
      `Expected a downgrade toward ${getPlanDisplayName(input.targetPlanId)}, got ${prepared.kind}.`,
    );
  }
  return prepared;
}

function classifyPlanChange(from: PlanId, to: PlanId): PlanChangeKind {
  if (from === to) return "lateral";
  if (to === "free") return "to_free";
  if (from === "free") return "from_free";
  const delta = comparePlans(to, from);
  if (delta > 0) return "upgrade";
  if (delta < 0) return "downgrade";
  return "lateral";
}

function buildChangeMessage(input: {
  kind: PlanChangeKind;
  fromPlanId: PlanId;
  toPlanId: PlanId;
  blockingMetrics: string[];
  requiresCheckout: boolean;
}): string {
  const fromName = getPlanDisplayName(input.fromPlanId);
  const toName = getPlanDisplayName(input.toPlanId);

  if (input.blockingMetrics.length > 0) {
    return `Cannot move from ${fromName} to ${toName} while usage exceeds ${input.blockingMetrics.join(", ")}. Reduce usage first.`;
  }

  switch (input.kind) {
    case "noop":
      return "Already on the selected plan.";
    case "from_free":
      return input.requiresCheckout
        ? `Start ${toName} via checkout.`
        : `Activate ${toName}.`;
    case "upgrade":
      return `Upgrade from ${fromName} to ${toName}.`;
    case "downgrade":
      return `Downgrade from ${fromName} to ${toName}.`;
    case "to_free":
      return `Cancel paid plan and return to ${toName}.`;
    case "lateral":
      return `Switch billing interval on ${toName}.`;
    default:
      return `Change plan from ${fromName} to ${toName}.`;
  }
}
