-- MABPS Email Engine schema.
-- Workspace id = organization.id from Better Auth.
-- Provider credentials, templates, campaigns, and delivery state are workspace-scoped.

CREATE TABLE IF NOT EXISTS "email_settings" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "provider" text not null default 'resend',
  "fromEmail" text,
  "fromName" text,
  "replyTo" text,
  "smtpHost" text,
  "smtpPort" integer,
  "smtpSecure" integer not null default 1,
  "smtpUser" text,
  "smtpPassword" text,
  "resendApiKey" text,
  "sesAccessKeyId" text,
  "sesSecretAccessKey" text,
  "sesRegion" text not null default 'us-east-1',
  "isConnected" integer not null default 0,
  "crmSyncEnabled" integer not null default 1,
  "automationEnabled" integer not null default 1,
  "analyticsEnabled" integer not null default 1,
  "openTrackingEnabled" integer not null default 1,
  "clickTrackingEnabled" integer not null default 1,
  "webhookPathSecret" text,
  "trackingSecret" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId")
);

CREATE INDEX IF NOT EXISTS "email_settings_webhookPathSecret_idx"
  ON "email_settings" ("webhookPathSecret");

CREATE TABLE IF NOT EXISTS "email_contact" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "email" text not null,
  "name" text,
  "status" text not null default 'subscribed',
  "crmContactId" text,
  "crmLeadId" text,
  "metadataJson" text not null default '{}',
  "lastEmailAt" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "email")
);

CREATE INDEX IF NOT EXISTS "email_contact_workspace_status_idx"
  ON "email_contact" ("workspaceId", "status");

CREATE TABLE IF NOT EXISTS "email_template" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "slug" text not null,
  "category" text not null default 'transactional',
  "subject" text not null,
  "html" text not null,
  "text" text,
  "variablesJson" text not null default '[]',
  "status" text not null default 'active',
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "slug")
);

CREATE INDEX IF NOT EXISTS "email_template_workspace_category_idx"
  ON "email_template" ("workspaceId", "category");

CREATE TABLE IF NOT EXISTS "email_message" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "contactId" text references "email_contact" ("id") on delete set null,
  "templateId" text references "email_template" ("id") on delete set null,
  "campaignId" text,
  "kind" text not null default 'transactional',
  "provider" text,
  "toEmail" text not null,
  "toName" text,
  "fromEmail" text,
  "fromName" text,
  "replyTo" text,
  "subject" text not null,
  "html" text,
  "text" text,
  "status" text not null default 'queued',
  "providerMessageId" text,
  "trackingToken" text,
  "errorMessage" text,
  "openCount" integer not null default 0,
  "clickCount" integer not null default 0,
  "sentAt" text,
  "deliveredAt" text,
  "openedAt" text,
  "clickedAt" text,
  "bouncedAt" text,
  "rawJson" text not null default '{}',
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "email_message_workspace_created_idx"
  ON "email_message" ("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "email_message_provider_idx"
  ON "email_message" ("providerMessageId");

CREATE INDEX IF NOT EXISTS "email_message_tracking_idx"
  ON "email_message" ("trackingToken");

CREATE INDEX IF NOT EXISTS "email_message_campaign_idx"
  ON "email_message" ("campaignId");

CREATE TABLE IF NOT EXISTS "email_campaign" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "templateId" text references "email_template" ("id") on delete set null,
  "subject" text not null,
  "html" text,
  "text" text,
  "status" text not null default 'draft',
  "totalRecipients" integer not null default 0,
  "sentCount" integer not null default 0,
  "failedCount" integer not null default 0,
  "openCount" integer not null default 0,
  "clickCount" integer not null default 0,
  "bounceCount" integer not null default 0,
  "scheduledAt" text,
  "startedAt" text,
  "completedAt" text,
  "createdByUserId" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "email_campaign_workspace_status_idx"
  ON "email_campaign" ("workspaceId", "status");

CREATE TABLE IF NOT EXISTS "email_campaign_recipient" (
  "id" text not null primary key,
  "campaignId" text not null references "email_campaign" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "contactId" text references "email_contact" ("id") on delete set null,
  "email" text not null,
  "name" text,
  "messageId" text references "email_message" ("id") on delete set null,
  "status" text not null default 'pending',
  "providerMessageId" text,
  "errorMessage" text,
  "sentAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "email_campaign_recipient_campaign_idx"
  ON "email_campaign_recipient" ("campaignId", "status");

CREATE TABLE IF NOT EXISTS "email_log" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "operation" text not null,
  "status" text not null default 'success',
  "provider" text,
  "email" text,
  "messageId" text,
  "campaignId" text,
  "providerMessageId" text,
  "latencyMs" integer,
  "errorMessage" text,
  "requestSummary" text,
  "responseSummary" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "email_log_workspace_created_idx"
  ON "email_log" ("workspaceId", "createdAt");

CREATE TABLE IF NOT EXISTS "email_event" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "messageId" text references "email_message" ("id") on delete set null,
  "campaignId" text,
  "contactId" text,
  "type" text not null,
  "email" text,
  "url" text,
  "providerMessageId" text,
  "userAgent" text,
  "ipHash" text,
  "metadataJson" text not null default '{}',
  "occurredAt" text not null,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "email_event_workspace_created_idx"
  ON "email_event" ("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "email_event_message_type_idx"
  ON "email_event" ("messageId", "type");
