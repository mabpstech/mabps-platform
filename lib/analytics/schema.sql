-- MABPS Analytics schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "analytics_event" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "source" text not null,
  "name" text not null,
  "entityType" text,
  "entityId" text,
  "userId" text,
  "value" real,
  "unit" text,
  "propertiesJson" text not null default '{}',
  "occurredAt" text not null,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "analytics_event_workspace_occurred_idx"
  ON "analytics_event" ("workspaceId", "occurredAt");

CREATE INDEX IF NOT EXISTS "analytics_event_workspace_source_name_idx"
  ON "analytics_event" ("workspaceId", "source", "name");

CREATE INDEX IF NOT EXISTS "analytics_event_workspace_user_idx"
  ON "analytics_event" ("workspaceId", "userId");

CREATE TABLE IF NOT EXISTS "analytics_api_request" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "method" text not null,
  "path" text not null,
  "statusCode" integer not null,
  "durationMs" integer,
  "userId" text,
  "ipHash" text,
  "userAgent" text,
  "occurredAt" text not null,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "analytics_api_request_workspace_occurred_idx"
  ON "analytics_api_request" ("workspaceId", "occurredAt");

CREATE INDEX IF NOT EXISTS "analytics_api_request_workspace_path_idx"
  ON "analytics_api_request" ("workspaceId", "path");

CREATE TABLE IF NOT EXISTS "analytics_ai_usage" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "provider" text not null,
  "model" text not null,
  "operation" text not null default 'chat',
  "inputTokens" integer not null default 0,
  "outputTokens" integer not null default 0,
  "totalTokens" integer not null default 0,
  "credits" real not null default 0,
  "success" integer not null default 1,
  "entityType" text,
  "entityId" text,
  "userId" text,
  "metadataJson" text not null default '{}',
  "occurredAt" text not null,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "analytics_ai_usage_workspace_occurred_idx"
  ON "analytics_ai_usage" ("workspaceId", "occurredAt");

CREATE INDEX IF NOT EXISTS "analytics_ai_usage_workspace_provider_idx"
  ON "analytics_ai_usage" ("workspaceId", "provider", "model");
