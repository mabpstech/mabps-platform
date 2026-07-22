"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  ResolvedPlan,
  UpgradePlanId,
  UsageLimit,
} from "@/lib/billing/engine/types";
import {
  BILLING_INTERVALS,
  formatLimit,
  formatUsd,
  PLANS,
  PLAN_IDS,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";
import type { BillingInvoice, UsageMetric } from "@/lib/billing/types";
import {
  authButtonClassName,
  authErrorClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";

export type UpgradeRecommendation = {
  planId: UpgradePlanId;
  planName: string;
  reason: string;
};

type BillingDashboardProps = {
  resolved: ResolvedPlan;
  upgradeRecommendation: UpgradeRecommendation | null;
  invoices: BillingInvoice[];
  canManage: boolean;
  stripeConfigured: boolean;
  checkoutStatus?: string | null;
};

const USAGE_LABELS: Record<UsageMetric, string> = {
  members: "Members",
  sites: "Sites",
  storageMb: "Storage (MB)",
  aiCredits: "AI credits (month)",
  automations: "Automations",
  plugins: "Marketplace plugins",
};

const USAGE_ORDER: UsageMetric[] = [
  "members",
  "sites",
  "storageMb",
  "aiCredits",
  "automations",
  "plugins",
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function usagePercent(current: number, limit: number): number {
  if (limit < 0) return 0;
  if (limit === 0) return current > 0 ? 100 : 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

function formatTrialStatus(resolved: ResolvedPlan): string {
  if (resolved.isTrialing) {
    const days = resolved.trialDaysRemaining;
    if (days === null) return "Trialing";
    if (days <= 0) return "Trial ending today";
    return `Trialing · ${days} day${days === 1 ? "" : "s"} left`;
  }
  if (resolved.subscription.trialEnd) {
    return `Ended ${formatDate(resolved.subscription.trialEnd)}`;
  }
  return "Not on trial";
}

export function BillingDashboard({
  resolved,
  upgradeRecommendation,
  invoices,
  canManage,
  stripeConfigured,
  checkoutStatus,
}: BillingDashboardProps) {
  const router = useRouter();
  const subscription = resolved.subscription;
  const [interval, setInterval] = useState<BillingInterval>(
    resolved.interval === "yearly" ? "yearly" : "monthly",
  );
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    checkoutStatus === "success"
      ? "Checkout completed. Your plan will update momentarily."
      : checkoutStatus === "canceled"
        ? "Checkout was canceled. No changes were made."
        : null,
  );

  const usageRows = useMemo(() => {
    return USAGE_ORDER.map((metric) => {
      const row: UsageLimit = resolved.usageLimits[metric];
      return {
        key: metric,
        label: USAGE_LABELS[metric],
        current: row.current,
        limit: row.limit,
        remaining: row.remaining,
        unlimited: row.unlimited,
        percent: usagePercent(row.current, row.limit),
      };
    });
  }, [resolved.usageLimits]);

  async function postJson(url: string, body?: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      url?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "Request failed.");
    }
    return data;
  }

  async function onSelectPlan(planId: PlanId) {
    if (!canManage) return;
    setError(null);
    setMessage(null);
    setPendingPlan(planId);

    try {
      if (!stripeConfigured && planId !== "free") {
        throw new Error("Stripe is not configured in this environment.");
      }

      const data = await postJson("/api/billing/change-plan", {
        planId,
        interval,
      });

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setMessage(
        planId === "free"
          ? "Subscription will cancel at the end of the billing period."
          : "Plan updated.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change plan.");
    } finally {
      setPendingPlan(null);
    }
  }

  async function onCancel(immediate: boolean) {
    if (!canManage) return;
    setError(null);
    setMessage(null);
    setPendingAction(immediate ? "cancel-now" : "cancel");

    try {
      await postJson("/api/billing/cancel", { immediate });
      setMessage(
        immediate
          ? "Subscription canceled. Workspace moved to Free."
          : "Cancellation scheduled for the end of the billing period.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel.");
    } finally {
      setPendingAction(null);
    }
  }

  async function onResume() {
    if (!canManage) return;
    setError(null);
    setMessage(null);
    setPendingAction("resume");

    try {
      await postJson("/api/billing/cancel", { resume: true });
      setMessage("Cancellation withdrawn. Your plan will renew as scheduled.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resume.");
    } finally {
      setPendingAction(null);
    }
  }

  async function onPortal() {
    if (!canManage) return;
    setError(null);
    setPendingAction("portal");
    try {
      const data = await postJson("/api/billing/portal");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("Billing portal URL missing.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open portal.");
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-8">
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      {message ? <div className={authSuccessClassName}>{message}</div> : null}

      {!stripeConfigured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Stripe keys are not configured. Free plan entitlements still apply;
          paid upgrades require <code className="font-mono">STRIPE_*</code>{" "}
          environment variables.
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-zinc-900">Current plan</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Workspace subscription and renewal status.
            </p>
          </div>
          {canManage && resolved.planId !== "free" ? (
            <button
              type="button"
              onClick={onPortal}
              disabled={pendingAction === "portal"}
              className={`${authSecondaryButtonClassName} w-auto`}
            >
              {pendingAction === "portal" ? "Opening…" : "Payment methods"}
            </button>
          ) : null}
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Plan
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {resolved.planName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Status
            </dt>
            <dd className="mt-1 text-sm font-semibold capitalize text-zinc-900">
              {resolved.status.replaceAll("_", " ")}
              {subscription.cancelAtPeriodEnd ? " · cancels at period end" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Trial
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {formatTrialStatus(resolved)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Billing
            </dt>
            <dd className="mt-1 text-sm font-semibold capitalize text-zinc-900">
              {resolved.planId === "free" ? "—" : resolved.interval}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Current period ends
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {formatDate(subscription.currentPeriodEnd)}
            </dd>
          </div>
        </dl>

        {canManage && resolved.planId !== "free" ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {subscription.cancelAtPeriodEnd ? (
              <button
                type="button"
                onClick={onResume}
                disabled={pendingAction === "resume"}
                className={`${authButtonClassName} w-auto`}
              >
                {pendingAction === "resume" ? "Resuming…" : "Keep subscription"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCancel(false)}
                disabled={pendingAction === "cancel"}
                className={`${authSecondaryButtonClassName} w-auto`}
              >
                {pendingAction === "cancel"
                  ? "Scheduling…"
                  : "Cancel at period end"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onCancel(true)}
              disabled={pendingAction === "cancel-now"}
              className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              {pendingAction === "cancel-now" ? "Canceling…" : "Cancel now"}
            </button>
          </div>
        ) : null}
      </section>

      {upgradeRecommendation ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium text-zinc-900">
            Upgrade recommendation
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Based on your plan entitlements and current usage.
          </p>
          <div className="mt-4">
            <p className="text-sm font-semibold text-zinc-900">
              {upgradeRecommendation.planName}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {upgradeRecommendation.reason}
            </p>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Usage</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Usage summary and limits for the {resolved.planName} plan.
        </p>
        <ul className="mt-6 space-y-4">
          {usageRows.map((row) => (
            <li key={row.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-800">{row.label}</span>
                <span className="text-zinc-500">
                  {row.current.toLocaleString("en-US")} /{" "}
                  {row.unlimited ? "∞" : formatLimit(row.limit)}
                  {!row.unlimited && row.remaining !== null ? (
                    <span className="ml-2 text-zinc-400">
                      ({row.remaining.toLocaleString("en-US")} left)
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${
                    row.percent >= 100
                      ? "bg-red-500"
                      : row.percent >= 80
                        ? "bg-amber-500"
                        : "bg-zinc-900"
                  }`}
                  style={{ width: `${row.unlimited ? 8 : row.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-zinc-900">Plans</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Upgrade, downgrade, or switch monthly/yearly billing.
            </p>
          </div>
          <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
            {BILLING_INTERVALS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                className={`rounded px-3 py-1.5 text-sm capitalize ${
                  interval === value
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {PLAN_IDS.map((planId) => {
            const plan = PLANS[planId];
            const isCurrent =
              resolved.planId === planId &&
              (planId === "free" || resolved.interval === interval);
            const price =
              interval === "yearly" ? plan.priceUsd.yearly : plan.priceUsd.monthly;
            const cta =
              planId === "free"
                ? resolved.planId === "free"
                  ? "Current plan"
                  : "Downgrade to Free"
                : isCurrent
                  ? "Current plan"
                  : resolved.planId === "free"
                    ? "Upgrade"
                    : planId === resolved.planId
                      ? `Switch to ${interval}`
                      : compareCta(resolved.planId, planId);

            return (
              <article
                key={planId}
                className={`rounded-xl border bg-white p-6 ${
                  plan.highlighted
                    ? "border-zinc-900 shadow-sm"
                    : "border-zinc-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {plan.description}
                    </p>
                  </div>
                  {isCurrent ? (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                      Current
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
                  {formatUsd(price)}
                  <span className="ml-1 text-sm font-normal text-zinc-500">
                    /{interval === "yearly" ? "year" : "month"}
                  </span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                {canManage ? (
                  <button
                    type="button"
                    disabled={isCurrent || pendingPlan === planId}
                    onClick={() => onSelectPlan(planId)}
                    className={`mt-6 ${
                      plan.highlighted
                        ? authButtonClassName
                        : authSecondaryButtonClassName
                    }`}
                  >
                    {pendingPlan === planId ? "Working…" : cta}
                  </button>
                ) : (
                  <p className="mt-6 text-sm text-zinc-500">
                    Ask a workspace owner or admin to change plans.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Billing history</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Invoices synced from Stripe webhooks and on-demand refresh.
        </p>

        {invoices.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No invoices yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Invoice</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 font-medium">Links</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4 text-zinc-700">
                      {formatDate(invoice.createdAt)}
                    </td>
                    <td className="py-3 pr-4 font-medium text-zinc-900">
                      {invoice.number ?? invoice.stripeInvoiceId}
                    </td>
                    <td className="py-3 pr-4 capitalize text-zinc-700">
                      {invoice.status ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-zinc-700">
                      {formatMoney(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-3">
                        {invoice.hostedInvoiceUrl ? (
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-900 underline-offset-2 hover:underline"
                          >
                            View
                          </a>
                        ) : null}
                        {invoice.invoicePdf ? (
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-900 underline-offset-2 hover:underline"
                          >
                            PDF
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function compareCta(current: PlanId, target: PlanId): string {
  const order: PlanId[] = ["free", "starter", "pro", "enterprise"];
  return order.indexOf(target) > order.indexOf(current) ? "Upgrade" : "Downgrade";
}
