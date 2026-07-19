import { randomUUID } from "node:crypto";
import { migrateBillingSchema } from "@/lib/billing/migrate";
import type { BillingInterval, PlanId } from "@/lib/billing/plans";
import type {
  BillingCustomer,
  BillingInvoice,
  SubscriptionStatus,
  UsageMetric,
  WorkspaceSubscription,
} from "@/lib/billing/types";
import { sqlite } from "@/lib/db";
import {
  CacheKeys,
  cacheGetOrSet,
  cacheSet,
  invalidateWorkspaceEntitlements,
} from "@/lib/platform/cache";

function nowIso(): string {
  return new Date().toISOString();
}

function rowToSubscription(row: Record<string, unknown>): WorkspaceSubscription {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    planId: row.planId as PlanId,
    interval: row.interval as BillingInterval,
    status: row.status as SubscriptionStatus,
    stripeSubscriptionId: row.stripeSubscriptionId
      ? String(row.stripeSubscriptionId)
      : null,
    stripePriceId: row.stripePriceId ? String(row.stripePriceId) : null,
    stripeCustomerId: row.stripeCustomerId
      ? String(row.stripeCustomerId)
      : null,
    currentPeriodStart: row.currentPeriodStart
      ? String(row.currentPeriodStart)
      : null,
    currentPeriodEnd: row.currentPeriodEnd
      ? String(row.currentPeriodEnd)
      : null,
    cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd),
    canceledAt: row.canceledAt ? String(row.canceledAt) : null,
    trialEnd: row.trialEnd ? String(row.trialEnd) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToCustomer(row: Record<string, unknown>): BillingCustomer {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    stripeCustomerId: String(row.stripeCustomerId),
    email: row.email ? String(row.email) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToInvoice(row: Record<string, unknown>): BillingInvoice {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    stripeInvoiceId: String(row.stripeInvoiceId),
    stripeCustomerId: row.stripeCustomerId
      ? String(row.stripeCustomerId)
      : null,
    number: row.number ? String(row.number) : null,
    status: row.status ? String(row.status) : null,
    currency: String(row.currency ?? "usd"),
    amountDue: Number(row.amountDue ?? 0),
    amountPaid: Number(row.amountPaid ?? 0),
    hostedInvoiceUrl: row.hostedInvoiceUrl
      ? String(row.hostedInvoiceUrl)
      : null,
    invoicePdf: row.invoicePdf ? String(row.invoicePdf) : null,
    periodStart: row.periodStart ? String(row.periodStart) : null,
    periodEnd: row.periodEnd ? String(row.periodEnd) : null,
    paidAt: row.paidAt ? String(row.paidAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function ensureBillingReady(): void {
  migrateBillingSchema();
}

export function getSubscriptionByWorkspaceId(
  workspaceId: string,
): WorkspaceSubscription | null {
  return cacheGetOrSet(CacheKeys.subscription(workspaceId), () => {
    ensureBillingReady();
    const row = sqlite
      .prepare(`SELECT * FROM "subscription" WHERE "workspaceId" = ?`)
      .get(workspaceId) as Record<string, unknown> | undefined;
    return row ? rowToSubscription(row) : null;
  });
}

export function getSubscriptionByStripeId(
  stripeSubscriptionId: string,
): WorkspaceSubscription | null {
  ensureBillingReady();
  const row = sqlite
    .prepare(`SELECT * FROM "subscription" WHERE "stripeSubscriptionId" = ?`)
    .get(stripeSubscriptionId) as Record<string, unknown> | undefined;
  return row ? rowToSubscription(row) : null;
}

export function ensureFreeSubscription(
  workspaceId: string,
): WorkspaceSubscription {
  ensureBillingReady();
  const existing = getSubscriptionByWorkspaceId(workspaceId);
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const id = randomUUID();
  invalidateWorkspaceEntitlements(workspaceId);
  sqlite
    .prepare(
      `INSERT INTO "subscription" (
        "id", "workspaceId", "planId", "interval", "status",
        "stripeSubscriptionId", "stripePriceId", "stripeCustomerId",
        "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd",
        "canceledAt", "trialEnd", "createdAt", "updatedAt"
      ) VALUES (?, ?, 'free', 'monthly', 'active', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, ?, ?)`,
    )
    .run(id, workspaceId, timestamp, timestamp);

  return getSubscriptionByWorkspaceId(workspaceId)!;
}

export type SubscriptionUpsertInput = {
  workspaceId: string;
  planId: PlanId;
  interval: BillingInterval;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCustomerId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  trialEnd?: string | null;
};

export function upsertSubscription(
  input: SubscriptionUpsertInput,
): WorkspaceSubscription {
  ensureBillingReady();
  const existing = getSubscriptionByWorkspaceId(input.workspaceId);
  const timestamp = nowIso();

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "subscription" SET
          "planId" = ?,
          "interval" = ?,
          "status" = ?,
          "stripeSubscriptionId" = ?,
          "stripePriceId" = ?,
          "stripeCustomerId" = ?,
          "currentPeriodStart" = ?,
          "currentPeriodEnd" = ?,
          "cancelAtPeriodEnd" = ?,
          "canceledAt" = ?,
          "trialEnd" = ?,
          "updatedAt" = ?
        WHERE "workspaceId" = ?`,
      )
      .run(
        input.planId,
        input.interval,
        input.status,
        input.stripeSubscriptionId ?? null,
        input.stripePriceId ?? null,
        input.stripeCustomerId ?? null,
        input.currentPeriodStart ?? null,
        input.currentPeriodEnd ?? null,
        input.cancelAtPeriodEnd ? 1 : 0,
        input.canceledAt ?? null,
        input.trialEnd ?? null,
        timestamp,
        input.workspaceId,
      );
  } else {
    sqlite
      .prepare(
        `INSERT INTO "subscription" (
          "id", "workspaceId", "planId", "interval", "status",
          "stripeSubscriptionId", "stripePriceId", "stripeCustomerId",
          "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd",
          "canceledAt", "trialEnd", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.workspaceId,
        input.planId,
        input.interval,
        input.status,
        input.stripeSubscriptionId ?? null,
        input.stripePriceId ?? null,
        input.stripeCustomerId ?? null,
        input.currentPeriodStart ?? null,
        input.currentPeriodEnd ?? null,
        input.cancelAtPeriodEnd ? 1 : 0,
        input.canceledAt ?? null,
        input.trialEnd ?? null,
        timestamp,
        timestamp,
      );
  }

  invalidateWorkspaceEntitlements(input.workspaceId);
  const subscription = getSubscriptionByWorkspaceId(input.workspaceId)!;
  cacheSet(CacheKeys.planId(input.workspaceId), subscription.planId);
  return subscription;
}

export function downgradeToFree(workspaceId: string): WorkspaceSubscription {
  return upsertSubscription({
    workspaceId,
    planId: "free",
    interval: "monthly",
    status: "active",
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCustomerId:
      getSubscriptionByWorkspaceId(workspaceId)?.stripeCustomerId ?? null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: nowIso(),
    trialEnd: null,
  });
}

export function getBillingCustomerByWorkspaceId(
  workspaceId: string,
): BillingCustomer | null {
  ensureBillingReady();
  const row = sqlite
    .prepare(`SELECT * FROM "billing_customer" WHERE "workspaceId" = ?`)
    .get(workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToCustomer(row) : null;
}

export function getBillingCustomerByStripeId(
  stripeCustomerId: string,
): BillingCustomer | null {
  ensureBillingReady();
  const row = sqlite
    .prepare(`SELECT * FROM "billing_customer" WHERE "stripeCustomerId" = ?`)
    .get(stripeCustomerId) as Record<string, unknown> | undefined;
  return row ? rowToCustomer(row) : null;
}

export function upsertBillingCustomer(input: {
  workspaceId: string;
  stripeCustomerId: string;
  email?: string | null;
}): BillingCustomer {
  ensureBillingReady();
  const existing = getBillingCustomerByWorkspaceId(input.workspaceId);
  const timestamp = nowIso();

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "billing_customer" SET
          "stripeCustomerId" = ?,
          "email" = COALESCE(?, "email"),
          "updatedAt" = ?
        WHERE "workspaceId" = ?`,
      )
      .run(
        input.stripeCustomerId,
        input.email ?? null,
        timestamp,
        input.workspaceId,
      );
  } else {
    sqlite
      .prepare(
        `INSERT INTO "billing_customer" (
          "id", "workspaceId", "stripeCustomerId", "email", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.workspaceId,
        input.stripeCustomerId,
        input.email ?? null,
        timestamp,
        timestamp,
      );
  }

  return getBillingCustomerByWorkspaceId(input.workspaceId)!;
}

export function upsertInvoice(input: {
  workspaceId: string;
  stripeInvoiceId: string;
  stripeCustomerId?: string | null;
  number?: string | null;
  status?: string | null;
  currency?: string;
  amountDue?: number;
  amountPaid?: number;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
}): BillingInvoice {
  ensureBillingReady();
  const timestamp = nowIso();
  const existing = sqlite
    .prepare(`SELECT "id" FROM "invoice" WHERE "stripeInvoiceId" = ?`)
    .get(input.stripeInvoiceId) as { id: string } | undefined;

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "invoice" SET
          "workspaceId" = ?,
          "stripeCustomerId" = ?,
          "number" = ?,
          "status" = ?,
          "currency" = ?,
          "amountDue" = ?,
          "amountPaid" = ?,
          "hostedInvoiceUrl" = ?,
          "invoicePdf" = ?,
          "periodStart" = ?,
          "periodEnd" = ?,
          "paidAt" = ?,
          "updatedAt" = ?
        WHERE "stripeInvoiceId" = ?`,
      )
      .run(
        input.workspaceId,
        input.stripeCustomerId ?? null,
        input.number ?? null,
        input.status ?? null,
        input.currency ?? "usd",
        input.amountDue ?? 0,
        input.amountPaid ?? 0,
        input.hostedInvoiceUrl ?? null,
        input.invoicePdf ?? null,
        input.periodStart ?? null,
        input.periodEnd ?? null,
        input.paidAt ?? null,
        timestamp,
        input.stripeInvoiceId,
      );
  } else {
    sqlite
      .prepare(
        `INSERT INTO "invoice" (
          "id", "workspaceId", "stripeInvoiceId", "stripeCustomerId", "number",
          "status", "currency", "amountDue", "amountPaid", "hostedInvoiceUrl",
          "invoicePdf", "periodStart", "periodEnd", "paidAt", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.workspaceId,
        input.stripeInvoiceId,
        input.stripeCustomerId ?? null,
        input.number ?? null,
        input.status ?? null,
        input.currency ?? "usd",
        input.amountDue ?? 0,
        input.amountPaid ?? 0,
        input.hostedInvoiceUrl ?? null,
        input.invoicePdf ?? null,
        input.periodStart ?? null,
        input.periodEnd ?? null,
        input.paidAt ?? null,
        input.createdAt ?? timestamp,
        timestamp,
      );
  }

  const row = sqlite
    .prepare(`SELECT * FROM "invoice" WHERE "stripeInvoiceId" = ?`)
    .get(input.stripeInvoiceId) as Record<string, unknown>;
  return rowToInvoice(row);
}

export function listInvoicesForWorkspace(
  workspaceId: string,
  limit = 50,
): BillingInvoice[] {
  ensureBillingReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "invoice"
       WHERE "workspaceId" = ?
       ORDER BY "createdAt" DESC
       LIMIT ?`,
    )
    .all(workspaceId, limit) as Record<string, unknown>[];
  return rows.map(rowToInvoice);
}

export function hasProcessedWebhookEvent(eventId: string): boolean {
  ensureBillingReady();
  const row = sqlite
    .prepare(`SELECT "id" FROM "stripe_webhook_event" WHERE "id" = ?`)
    .get(eventId) as { id: string } | undefined;
  return Boolean(row);
}

export function markWebhookEventProcessed(
  eventId: string,
  type: string,
): void {
  ensureBillingReady();
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO "stripe_webhook_event" ("id", "type", "processedAt")
       VALUES (?, ?, ?)`,
    )
    .run(eventId, type, nowIso());
}

export function getUsageValue(
  workspaceId: string,
  metric: UsageMetric,
  periodKey: string,
): number {
  ensureBillingReady();
  const row = sqlite
    .prepare(
      `SELECT "value" FROM "usage_counter"
       WHERE "workspaceId" = ? AND "metric" = ? AND "periodKey" = ?`,
    )
    .get(workspaceId, metric, periodKey) as { value: number } | undefined;
  return row?.value ?? 0;
}

export function setUsageValue(
  workspaceId: string,
  metric: UsageMetric,
  periodKey: string,
  value: number,
): void {
  ensureBillingReady();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "usage_counter" ("id", "workspaceId", "metric", "value", "periodKey", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT("workspaceId", "metric", "periodKey")
       DO UPDATE SET "value" = excluded."value", "updatedAt" = excluded."updatedAt"`,
    )
    .run(randomUUID(), workspaceId, metric, value, periodKey, timestamp);
}

export function incrementUsageValue(
  workspaceId: string,
  metric: UsageMetric,
  periodKey: string,
  delta = 1,
): number {
  const current = getUsageValue(workspaceId, metric, periodKey);
  const next = Math.max(0, current + delta);
  setUsageValue(workspaceId, metric, periodKey, next);
  return next;
}

export function countWorkspaceMembers(workspaceId: string): number {
  const row = sqlite
    .prepare(`SELECT COUNT(*) as count FROM "member" WHERE "organizationId" = ?`)
    .get(workspaceId) as { count: number };
  return Number(row.count ?? 0);
}

export function countPendingInvitations(workspaceId: string): number {
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "invitation"
       WHERE "organizationId" = ? AND "status" = 'pending'`,
    )
    .get(workspaceId) as { count: number };
  return Number(row.count ?? 0);
}
