-- MABPS Billing & Subscription schema (Stripe).
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "billing_customer" (
  "id" text not null primary key,
  "workspaceId" text not null unique references "organization" ("id") on delete cascade,
  "stripeCustomerId" text not null unique,
  "email" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "subscription" (
  "id" text not null primary key,
  "workspaceId" text not null unique references "organization" ("id") on delete cascade,
  "planId" text not null,
  "interval" text not null,
  "status" text not null,
  "stripeSubscriptionId" text unique,
  "stripePriceId" text,
  "stripeCustomerId" text,
  "currentPeriodStart" text,
  "currentPeriodEnd" text,
  "cancelAtPeriodEnd" integer not null default 0,
  "canceledAt" text,
  "trialEnd" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "invoice" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "stripeInvoiceId" text not null unique,
  "stripeCustomerId" text,
  "number" text,
  "status" text,
  "currency" text not null default 'usd',
  "amountDue" integer not null default 0,
  "amountPaid" integer not null default 0,
  "hostedInvoiceUrl" text,
  "invoicePdf" text,
  "periodStart" text,
  "periodEnd" text,
  "paidAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "usage_counter" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "metric" text not null,
  "value" integer not null default 0,
  "periodKey" text not null,
  "updatedAt" text not null,
  unique ("workspaceId", "metric", "periodKey")
);

CREATE TABLE IF NOT EXISTS "stripe_webhook_event" (
  "id" text not null primary key,
  "type" text not null,
  "processedAt" text not null
);

CREATE INDEX IF NOT EXISTS "billing_customer_workspaceId_idx" on "billing_customer" ("workspaceId");
CREATE INDEX IF NOT EXISTS "subscription_workspaceId_idx" on "subscription" ("workspaceId");
CREATE INDEX IF NOT EXISTS "subscription_stripeSubscriptionId_idx" on "subscription" ("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "invoice_workspaceId_idx" on "invoice" ("workspaceId");
CREATE INDEX IF NOT EXISTS "invoice_createdAt_idx" on "invoice" ("createdAt");
CREATE INDEX IF NOT EXISTS "usage_counter_workspaceId_idx" on "usage_counter" ("workspaceId");
