"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  ResolvedPlan,
  UpgradePlanId,
} from "@/lib/billing/engine/types";
import {
  BILLING_INTERVALS,
  formatUsd,
  PLANS,
  PLAN_IDS,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";
import type { BillingInvoice } from "@/lib/billing/types";
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

type BillingPortalProps = {
  resolved: ResolvedPlan;
  upgradeRecommendation: UpgradeRecommendation | null;
  invoices: BillingInvoice[];
  canManage: boolean;
  stripeConfigured: boolean;
  razorpayConfigured: boolean;
  checkoutStatus?: string | null;
};

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

function compareCta(current: PlanId, target: PlanId): string {
  const order: PlanId[] = ["free", "starter", "pro", "enterprise"];
  return order.indexOf(target) > order.indexOf(current) ? "Upgrade" : "Downgrade";
}

/**
 * Customer Billing Portal — Current Plan, Upgrade, Cancel, History, Invoices.
 * Driven by Billing Engine resolved plan + change/cancel APIs.
 */
export function BillingPortal({
  resolved,
  upgradeRecommendation,
  invoices,
  canManage,
  stripeConfigured,
  razorpayConfigured,
  checkoutStatus,
}: BillingPortalProps) {
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
      const needsCheckout =
        planId !== "free" &&
        (resolved.planId === "free" ||
          !resolved.subscription.providerSubscriptionId);

      if (needsCheckout && !razorpayConfigured) {
        throw new Error(
          "Razorpay is not configured in this environment.",
        );
      }

      if (
        !needsCheckout &&
        planId !== "free" &&
        !stripeConfigured &&
        !razorpayConfigured
      ) {
        throw new Error("No payment provider is configured in this environment.");
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

  const paidInvoices = invoices.filter(
    (invoice) =>
      invoice.status === "paid" ||
      invoice.amountPaid > 0 ||
      Boolean(invoice.paidAt),
  );

  return (
    <div className="space-y-8">
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      {message ? <div className={authSuccessClassName}>{message}</div> : null}

      {!razorpayConfigured && !stripeConfigured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Payment providers are not configured. Free plan entitlements still
          apply; paid upgrades require <code className="font-mono">RAZORPAY_*</code>{" "}
          environment variables.
        </div>
      ) : null}

      {/* Current Plan */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Current Plan</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Workspace subscription and renewal status from the Billing Engine.
          </p>
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

        {upgradeRecommendation ? (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <p className="text-sm font-medium text-zinc-900">
              Suggested upgrade: {upgradeRecommendation.planName}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {upgradeRecommendation.reason}
            </p>
          </div>
        ) : null}
      </section>

      {/* Upgrade */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-zinc-900">Upgrade</h2>
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

      {/* Cancel Subscription */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">
          Cancel Subscription
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          End your paid plan at period end or immediately. Immediate cancel
          moves the workspace to Free.
        </p>

        {!canManage ? (
          <p className="mt-6 text-sm text-zinc-500">
            Ask a workspace owner or admin to manage cancellation.
          </p>
        ) : resolved.planId === "free" ? (
          <p className="mt-6 text-sm text-zinc-500">
            You are on the Free plan. There is no paid subscription to cancel.
          </p>
        ) : (
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
        )}
      </section>

      {/* Billing History */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Billing History</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Recent charges and payments for this workspace.
        </p>

        {paidInvoices.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No billing history yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paidInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4 text-zinc-700">
                      {formatDate(invoice.paidAt ?? invoice.createdAt)}
                    </td>
                    <td className="py-3 pr-4 font-medium text-zinc-900">
                      {invoice.number ?? invoice.stripeInvoiceId}
                    </td>
                    <td className="py-3 pr-4 capitalize text-zinc-700">
                      {invoice.status ?? "paid"}
                    </td>
                    <td className="py-3 text-zinc-700">
                      {formatMoney(
                        invoice.amountPaid || invoice.amountDue,
                        invoice.currency,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Invoices */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Invoices</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Downloadable invoices from the Billing Engine provider sync.
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
                      {formatMoney(
                        invoice.amountPaid || invoice.amountDue,
                        invoice.currency,
                      )}
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
                        {!invoice.hostedInvoiceUrl && !invoice.invoicePdf ? (
                          <span className="text-zinc-400">—</span>
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
