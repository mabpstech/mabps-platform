-- MABPS Marketplace & Plugin System schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "marketplace_listing" (
  "id" text not null primary key,
  "publisherWorkspaceId" text references "organization" ("id") on delete set null,
  "kind" text not null,
  "slug" text not null,
  "name" text not null,
  "summary" text not null default '',
  "description" text not null default '',
  "status" text not null default 'draft',
  "visibility" text not null default 'public',
  "pricingModel" text not null default 'free',
  "priceCents" integer not null default 0,
  "currency" text not null default 'usd',
  "minPlanId" text not null default 'free',
  "iconUrl" text,
  "coverUrl" text,
  "categoriesJson" text not null default '[]',
  "tagsJson" text not null default '[]',
  "permissionsJson" text not null default '[]',
  "manifestJson" text not null default '{}',
  "latestVersion" text not null default '1.0.0',
  "downloads" integer not null default 0,
  "ratingAverage" real not null default 0,
  "ratingCount" integer not null default 0,
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null,
  "publishedAt" text,
  UNIQUE ("slug")
);

CREATE INDEX IF NOT EXISTS "marketplace_listing_kind_status_idx"
  ON "marketplace_listing" ("kind", "status");

CREATE INDEX IF NOT EXISTS "marketplace_listing_publisher_idx"
  ON "marketplace_listing" ("publisherWorkspaceId");

CREATE INDEX IF NOT EXISTS "marketplace_listing_visibility_idx"
  ON "marketplace_listing" ("visibility", "status");

CREATE TABLE IF NOT EXISTS "marketplace_listing_version" (
  "id" text not null primary key,
  "listingId" text not null references "marketplace_listing" ("id") on delete cascade,
  "version" text not null,
  "changelog" text,
  "packageUrl" text,
  "checksum" text,
  "manifestJson" text not null default '{}',
  "isLatest" integer not null default 0,
  "createdAt" text not null,
  UNIQUE ("listingId", "version")
);

CREATE INDEX IF NOT EXISTS "marketplace_listing_version_listing_idx"
  ON "marketplace_listing_version" ("listingId", "isLatest");

CREATE TABLE IF NOT EXISTS "marketplace_install" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "listingId" text not null references "marketplace_listing" ("id") on delete cascade,
  "versionId" text not null references "marketplace_listing_version" ("id"),
  "version" text not null,
  "status" text not null default 'installed',
  "enabled" integer not null default 1,
  "configJson" text not null default '{}',
  "grantedPermissionsJson" text not null default '[]',
  "installedByUserId" text,
  "lastError" text,
  "installedAt" text not null,
  "updatedAt" text not null,
  "disabledAt" text,
  UNIQUE ("workspaceId", "listingId")
);

CREATE INDEX IF NOT EXISTS "marketplace_install_workspace_status_idx"
  ON "marketplace_install" ("workspaceId", "status", "enabled");

CREATE TABLE IF NOT EXISTS "marketplace_developer" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "displayName" text not null,
  "websiteUrl" text,
  "supportEmail" text,
  "bio" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId")
);

CREATE TABLE IF NOT EXISTS "marketplace_api_key" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "developerId" text not null references "marketplace_developer" ("id") on delete cascade,
  "name" text not null,
  "keyPrefix" text not null,
  "keyHash" text not null,
  "scopesJson" text not null default '[]',
  "lastUsedAt" text,
  "revokedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("keyHash")
);

CREATE INDEX IF NOT EXISTS "marketplace_api_key_workspace_idx"
  ON "marketplace_api_key" ("workspaceId", "revokedAt");

CREATE TABLE IF NOT EXISTS "marketplace_sandbox_run" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "installId" text references "marketplace_install" ("id") on delete set null,
  "listingId" text references "marketplace_listing" ("id") on delete set null,
  "hook" text not null,
  "status" text not null default 'queued',
  "inputJson" text not null default '{}',
  "outputJson" text not null default '{}',
  "logsJson" text not null default '[]',
  "permissionsUsedJson" text not null default '[]',
  "errorMessage" text,
  "durationMs" integer,
  "createdAt" text not null,
  "finishedAt" text
);

CREATE INDEX IF NOT EXISTS "marketplace_sandbox_run_workspace_idx"
  ON "marketplace_sandbox_run" ("workspaceId", "createdAt");

CREATE TABLE IF NOT EXISTS "marketplace_purchase" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "listingId" text not null references "marketplace_listing" ("id") on delete cascade,
  "status" text not null default 'pending',
  "pricingModel" text not null,
  "amountCents" integer not null default 0,
  "currency" text not null default 'usd',
  "stripePaymentIntentId" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null,
  "completedAt" text
);

CREATE INDEX IF NOT EXISTS "marketplace_purchase_workspace_idx"
  ON "marketplace_purchase" ("workspaceId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_purchase_workspace_listing_completed_idx"
  ON "marketplace_purchase" ("workspaceId", "listingId")
  WHERE "status" = 'completed';
