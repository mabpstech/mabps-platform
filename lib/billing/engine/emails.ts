/**
 * Billing Engine → platform EmailService lifecycle notifications.
 * Distinct from product `lib/email-engine` (workspace campaigns).
 */

import { getPlanDisplayName } from "@/lib/billing/engine/plans";
import { getTrialDaysRemaining } from "@/lib/billing/engine/trial";
import { formatUsd, getPlan, type BillingInterval, type PlanId } from "@/lib/billing/plans";
import {
  getBillingCustomerByWorkspaceId,
  hasProcessedWebhookEvent,
  listTrialingSubscriptions,
  markWebhookEventProcessed,
} from "@/lib/billing/repository";
import { sqlite } from "@/lib/db";
import {
  sendPaymentFailedEmail,
  sendPaymentSuccessEmail,
  sendSubscriptionCancelledEmail,
  sendTrialEndingEmail,
} from "@/lib/email";

const DEFAULT_TRIAL_ENDING_DAYS = 3;

export type BillingEmailRecipient = {
  email: string;
  name: string | null;
  workspaceName: string | null;
};

function getBillingAppBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function billingSettingsUrl(): string {
  return `${getBillingAppBaseUrl()}/settings/workspace/billing`;
}

function formatDisplayDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format provider amount (smallest currency unit) or fall back to plan list price.
 */
export function formatBillingAmount(input: {
  amountPaid?: number | null;
  currency?: string | null;
  planId: PlanId;
  interval: BillingInterval;
}): string {
  if (
    typeof input.amountPaid === "number" &&
    Number.isFinite(input.amountPaid) &&
    input.amountPaid >= 0
  ) {
    const currency = (input.currency ?? "usd").toUpperCase();
    const major = input.amountPaid / 100;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: major % 1 === 0 ? 0 : 2,
      }).format(major);
    } catch {
      return `${major.toFixed(2)} ${currency}`;
    }
  }

  return formatUsd(getPlan(input.planId).priceUsd[input.interval]);
}

/**
 * Resolve the billing email recipient for a workspace.
 * Prefers billing_customer.email, then the workspace owner.
 */
export function resolveBillingEmailRecipient(
  workspaceId: string,
): BillingEmailRecipient | null {
  const customer = getBillingCustomerByWorkspaceId(workspaceId);
  const org = sqlite
    .prepare(`SELECT "name" FROM "organization" WHERE "id" = ?`)
    .get(workspaceId) as { name: string } | undefined;
  const owner = sqlite
    .prepare(
      `SELECT u."email" as email, u."name" as name
       FROM "member" m
       INNER JOIN "user" u ON u."id" = m."userId"
       WHERE m."organizationId" = ? AND m."role" = 'owner'
       LIMIT 1`,
    )
    .get(workspaceId) as { email: string; name: string } | undefined;

  const email = customer?.email?.trim() || owner?.email?.trim() || null;
  if (!email) {
    return null;
  }

  return {
    email,
    name: owner?.name?.trim() || null,
    workspaceName: org?.name?.trim() || null,
  };
}

function claimEmailEvent(eventId: string, type: string): boolean {
  if (hasProcessedWebhookEvent(eventId)) {
    return false;
  }
  markWebhookEventProcessed(eventId, type);
  return true;
}

async function safeSend(
  label: string,
  workspaceId: string,
  send: () => Promise<void>,
): Promise<boolean> {
  try {
    await send();
    return true;
  } catch (error) {
    console.error(`[billing/email] ${label} failed for ${workspaceId}`, error);
    return false;
  }
}

/**
 * Payment succeeded (invoice paid / payment.success activation).
 */
export async function notifyPaymentSuccess(input: {
  workspaceId: string;
  planId: PlanId;
  interval: BillingInterval;
  amountPaid?: number | null;
  currency?: string | null;
  invoiceUrl?: string | null;
  /** Optional idempotency key; defaults to workspace + plan + day. */
  eventKey?: string;
}): Promise<boolean> {
  const recipient = resolveBillingEmailRecipient(input.workspaceId);
  if (!recipient) {
    console.warn(
      `[billing/email] No recipient for payment success (${input.workspaceId})`,
    );
    return false;
  }

  const dayKey = new Date().toISOString().slice(0, 10);
  const eventId =
    input.eventKey ??
    `email:payment_success:${input.workspaceId}:${input.planId}:${dayKey}`;
  if (!claimEmailEvent(eventId, "billing_email.payment_success")) {
    return false;
  }

  return safeSend("payment_success", input.workspaceId, () =>
    sendPaymentSuccessEmail({
      email: recipient.email,
      name: recipient.name,
      workspaceName: recipient.workspaceName,
      planName: getPlanDisplayName(input.planId),
      amountFormatted: formatBillingAmount({
        amountPaid: input.amountPaid,
        currency: input.currency,
        planId: input.planId,
        interval: input.interval,
      }),
      invoiceUrl: input.invoiceUrl,
      billingUrl: billingSettingsUrl(),
    }),
  );
}

/**
 * Payment failed (invoice.payment_failed / payment.failed → past due).
 */
export async function notifyPaymentFailed(input: {
  workspaceId: string;
  planId: PlanId;
  gracePeriodEnd?: string | null;
  providerInvoiceId?: string | null;
  /** Optional idempotency key; defaults to workspace + invoice / day. */
  eventKey?: string;
}): Promise<boolean> {
  if (input.planId === "free") {
    return false;
  }

  const recipient = resolveBillingEmailRecipient(input.workspaceId);
  if (!recipient) {
    console.warn(
      `[billing/email] No recipient for payment failed (${input.workspaceId})`,
    );
    return false;
  }

  const dayKey = new Date().toISOString().slice(0, 10);
  const eventId =
    input.eventKey ??
    `email:payment_failed:${input.workspaceId}:${input.providerInvoiceId ?? dayKey}`;
  if (!claimEmailEvent(eventId, "billing_email.payment_failed")) {
    return false;
  }

  return safeSend("payment_failed", input.workspaceId, () =>
    sendPaymentFailedEmail({
      email: recipient.email,
      name: recipient.name,
      workspaceName: recipient.workspaceName,
      planName: getPlanDisplayName(input.planId),
      graceEndsAt: formatDisplayDate(input.gracePeriodEnd),
      billingUrl: billingSettingsUrl(),
    }),
  );
}

/**
 * Subscription cancelled (immediate or at period end).
 */
export async function notifySubscriptionCancelled(input: {
  workspaceId: string;
  planId: PlanId;
  endsAt?: string | null;
  providerSubscriptionId?: string | null;
}): Promise<boolean> {
  if (input.planId === "free") {
    return false;
  }

  const recipient = resolveBillingEmailRecipient(input.workspaceId);
  if (!recipient) {
    console.warn(
      `[billing/email] No recipient for subscription cancelled (${input.workspaceId})`,
    );
    return false;
  }

  const eventId = `email:subscription_cancelled:${input.workspaceId}:${
    input.providerSubscriptionId ?? input.endsAt ?? "unknown"
  }`;
  if (!claimEmailEvent(eventId, "billing_email.subscription_cancelled")) {
    return false;
  }

  return safeSend("subscription_cancelled", input.workspaceId, () =>
    sendSubscriptionCancelledEmail({
      email: recipient.email,
      name: recipient.name,
      workspaceName: recipient.workspaceName,
      planName: getPlanDisplayName(input.planId),
      endsAt: formatDisplayDate(input.endsAt),
      billingUrl: billingSettingsUrl(),
    }),
  );
}

/**
 * Trial ending soon for a single subscription.
 */
export async function notifyTrialEnding(input: {
  workspaceId: string;
  planId: PlanId;
  trialEnd: string;
}): Promise<boolean> {
  if (input.planId === "free") {
    return false;
  }

  const recipient = resolveBillingEmailRecipient(input.workspaceId);
  if (!recipient) {
    console.warn(
      `[billing/email] No recipient for trial ending (${input.workspaceId})`,
    );
    return false;
  }

  const trialEndsAt = formatDisplayDate(input.trialEnd);
  if (!trialEndsAt) {
    return false;
  }

  const eventId = `email:trial_ending:${input.workspaceId}:${input.trialEnd}`;
  if (!claimEmailEvent(eventId, "billing_email.trial_ending")) {
    return false;
  }

  return safeSend("trial_ending", input.workspaceId, () =>
    sendTrialEndingEmail({
      email: recipient.email,
      name: recipient.name,
      workspaceName: recipient.workspaceName,
      planName: getPlanDisplayName(input.planId),
      trialEndsAt,
      upgradeUrl: billingSettingsUrl(),
    }),
  );
}

/**
 * Scan trialing subscriptions and send trial-ending emails within the window.
 * Intended for a cron / worker entrypoint.
 */
export async function processTrialEndingNotifications(
  input: {
    withinDays?: number;
    now?: Date;
  } = {},
): Promise<{ scanned: number; sent: number; skipped: number }> {
  const withinDays = input.withinDays ?? DEFAULT_TRIAL_ENDING_DAYS;
  const now = input.now ?? new Date();
  const subscriptions = listTrialingSubscriptions();

  let sent = 0;
  let skipped = 0;

  for (const row of subscriptions) {
    if (!row.trialEnd || row.planId === "free") {
      skipped += 1;
      continue;
    }

    const daysRemaining = getTrialDaysRemaining(
      {
        status: row.status,
        trialEnd: row.trialEnd,
      },
      now,
    );

    if (
      daysRemaining === null ||
      daysRemaining <= 0 ||
      daysRemaining > withinDays
    ) {
      skipped += 1;
      continue;
    }

    const ok = await notifyTrialEnding({
      workspaceId: row.workspaceId,
      planId: row.planId,
      trialEnd: row.trialEnd,
    });
    if (ok) {
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { scanned: subscriptions.length, sent, skipped };
}
