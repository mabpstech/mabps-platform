-- MABPS Knowledge Base schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "kb_source" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "type" text not null,
  "title" text not null,
  "status" text not null default 'pending',
  "sourceUrl" text,
  "fileName" text,
  "mimeType" text,
  "storagePath" text,
  "byteSize" integer not null default 0,
  "errorMessage" text,
  "chunkCount" integer not null default 0,
  "currentVersion" integer not null default 0,
  "crawlConfigJson" text not null default '{}',
  "metadataJson" text not null default '{}',
  "lastIndexedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "kb_source_workspace_status_idx"
  ON "kb_source" ("workspaceId", "status");

CREATE INDEX IF NOT EXISTS "kb_source_workspace_type_idx"
  ON "kb_source" ("workspaceId", "type");

CREATE TABLE IF NOT EXISTS "kb_source_version" (
  "id" text not null primary key,
  "sourceId" text not null references "kb_source" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "version" integer not null,
  "status" text not null default 'pending',
  "chunkCount" integer not null default 0,
  "contentHash" text,
  "errorMessage" text,
  "createdAt" text not null,
  "indexedAt" text,
  UNIQUE ("sourceId", "version")
);

CREATE INDEX IF NOT EXISTS "kb_source_version_source_idx"
  ON "kb_source_version" ("sourceId", "version");

CREATE TABLE IF NOT EXISTS "kb_chunk" (
  "id" text not null primary key,
  "sourceId" text not null references "kb_source" ("id") on delete cascade,
  "versionId" text not null references "kb_source_version" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "chunkIndex" integer not null default 0,
  "content" text not null,
  "tokenEstimate" integer not null default 0,
  "metadataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "kb_chunk_workspace_version_idx"
  ON "kb_chunk" ("workspaceId", "versionId");

CREATE INDEX IF NOT EXISTS "kb_chunk_source_idx"
  ON "kb_chunk" ("sourceId", "chunkIndex");

CREATE TABLE IF NOT EXISTS "kb_embedding" (
  "id" text not null primary key,
  "chunkId" text not null references "kb_chunk" ("id") on delete cascade,
  "sourceId" text not null references "kb_source" ("id") on delete cascade,
  "versionId" text not null references "kb_source_version" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "provider" text not null,
  "model" text not null,
  "dimensions" integer not null,
  "vectorJson" text not null,
  "createdAt" text not null,
  UNIQUE ("chunkId", "provider", "model")
);

CREATE INDEX IF NOT EXISTS "kb_embedding_workspace_version_idx"
  ON "kb_embedding" ("workspaceId", "versionId");

CREATE INDEX IF NOT EXISTS "kb_embedding_source_idx"
  ON "kb_embedding" ("sourceId");
