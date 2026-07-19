-- MABPS Notifications schema.
-- Workspace id = organization.id from Better Auth.
-- Preferences, templates, deliveries, and subscriptions are workspace-scoped.

CREATE TABLE IF NOT EXISTS "notification_settings" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "inAppEnabled" integer not null default 1,
  "pushEnabled" integer not null default 1,
  "emailEnabled" integer not null default 1,
  "whatsappEnabled" integer not null default 1,
  "browserEnabled" integer not null default 1,
  "defaultChannelsJson" text not null default '["in_app"]',
  "defaultPriority" text not null default 'normal',
  "crmSyncEnabled" integer not null default 1,
  "automationEnabled" integer not null default 1,
  "analyticsEnabled" integer not null default 1,
  "vapidPublicKey" text,
  "vapidPrivateKey" text,
  "pushEndpoint" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId")
);

CREATE TABLE IF NOT EXISTS "notification_preference" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "userId" text not null,
  "inAppEnabled" integer not null default 1,
  "pushEnabled" integer not null default 1,
  "emailEnabled" integer not null default 1,
  "whatsappEnabled" integer not null default 0,
  "browserEnabled" integer not null default 1,
  "quietHoursStart" text,
  "quietHoursEnd" text,
  "timezone" text not null default 'UTC',
  "categoryOverridesJson" text not null default '{}',
  "emailAddress" text,
  "phoneNumber" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "userId")
);

CREATE INDEX IF NOT EXISTS "notification_preference_workspace_idx"
  ON "notification_preference" ("workspaceId");

CREATE TABLE IF NOT EXISTS "notification_template" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "slug" text not null,
  "category" text not null default 'system',
  "title" text not null,
  "body" text not null,
  "channelsJson" text not null default '["in_app"]',
  "priority" text not null default 'normal',
  "variablesJson" text not null default '[]',
  "status" text not null default 'active',
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "slug")
);

CREATE INDEX IF NOT EXISTS "notification_template_workspace_category_idx"
  ON "notification_template" ("workspaceId", "category");

CREATE TABLE IF NOT EXISTS "notification" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "userId" text,
  "templateId" text references "notification_template" ("id") on delete set null,
  "category" text not null default 'system',
  "priority" text not null default 'normal',
  "title" text not null,
  "body" text not null,
  "href" text,
  "status" text not null default 'pending',
  "channelsJson" text not null default '["in_app"]',
  "crmEntityType" text,
  "crmEntityId" text,
  "isRead" integer not null default 0,
  "readAt" text,
  "deliveredAt" text,
  "failedAt" text,
  "errorMessage" text,
  "metadataJson" text not null default '{}',
  "createdByUserId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "notification_workspace_created_idx"
  ON "notification" ("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "notification_workspace_user_unread_idx"
  ON "notification" ("workspaceId", "userId", "isRead");

CREATE INDEX IF NOT EXISTS "notification_workspace_status_idx"
  ON "notification" ("workspaceId", "status");

CREATE TABLE IF NOT EXISTS "notification_delivery" (
  "id" text not null primary key,
  "notificationId" text not null references "notification" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "channel" text not null,
  "status" text not null default 'queued',
  "providerMessageId" text,
  "errorMessage" text,
  "latencyMs" integer,
  "rawJson" text not null default '{}',
  "sentAt" text,
  "deliveredAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "notification_delivery_notification_idx"
  ON "notification_delivery" ("notificationId", "channel");

CREATE INDEX IF NOT EXISTS "notification_delivery_workspace_created_idx"
  ON "notification_delivery" ("workspaceId", "createdAt");

CREATE TABLE IF NOT EXISTS "notification_subscription" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "userId" text not null,
  "channel" text not null,
  "endpoint" text not null,
  "p256dh" text,
  "auth" text,
  "userAgent" text,
  "isActive" integer not null default 1,
  "lastUsedAt" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "userId", "endpoint")
);

CREATE INDEX IF NOT EXISTS "notification_subscription_workspace_user_idx"
  ON "notification_subscription" ("workspaceId", "userId", "isActive");

CREATE TABLE IF NOT EXISTS "notification_log" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "operation" text not null,
  "status" text not null default 'success',
  "channel" text,
  "notificationId" text,
  "userId" text,
  "latencyMs" integer,
  "errorMessage" text,
  "requestSummary" text,
  "responseSummary" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "notification_log_workspace_created_idx"
  ON "notification_log" ("workspaceId", "createdAt");

CREATE TABLE IF NOT EXISTS "notification_event" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "notificationId" text,
  "userId" text,
  "type" text not null,
  "channel" text,
  "metadataJson" text not null default '{}',
  "occurredAt" text not null,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "notification_event_workspace_created_idx"
  ON "notification_event" ("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "notification_event_notification_type_idx"
  ON "notification_event" ("notificationId", "type");
