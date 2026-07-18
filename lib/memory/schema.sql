-- MABPS Memory Engine schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "memory_entry" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "kind" text not null,
  "scopeType" text not null default 'workspace',
  "scopeId" text,
  "key" text,
  "content" text not null,
  "importance" real not null default 0.5,
  "score" real not null default 0.5,
  "source" text not null default 'api',
  "metadataJson" text not null default '{}',
  "expiresAt" text,
  "lastAccessedAt" text,
  "accessCount" integer not null default 0,
  "mergedIntoId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "memory_entry_workspace_kind_idx"
  ON "memory_entry" ("workspaceId", "kind");

CREATE INDEX IF NOT EXISTS "memory_entry_workspace_scope_idx"
  ON "memory_entry" ("workspaceId", "scopeType", "scopeId");

CREATE INDEX IF NOT EXISTS "memory_entry_workspace_key_idx"
  ON "memory_entry" ("workspaceId", "kind", "scopeType", "scopeId", "key");

CREATE INDEX IF NOT EXISTS "memory_entry_expires_idx"
  ON "memory_entry" ("workspaceId", "expiresAt");

CREATE INDEX IF NOT EXISTS "memory_entry_merged_idx"
  ON "memory_entry" ("workspaceId", "mergedIntoId");

CREATE TABLE IF NOT EXISTS "memory_embedding" (
  "id" text not null primary key,
  "memoryId" text not null references "memory_entry" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "provider" text not null,
  "model" text not null,
  "dimensions" integer not null,
  "vectorJson" text not null,
  "createdAt" text not null,
  UNIQUE ("memoryId", "provider", "model")
);

CREATE INDEX IF NOT EXISTS "memory_embedding_workspace_idx"
  ON "memory_embedding" ("workspaceId");
