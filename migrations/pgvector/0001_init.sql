-- P3-5: dedicated pgvector schema (applied automatically by ensurePgvectorSchema,
-- or manually against VECTOR_DATABASE_URL).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS kb_embedding_vector (
  id TEXT PRIMARY KEY,
  "chunkId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding vector NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("chunkId", provider, model)
);

CREATE INDEX IF NOT EXISTS kb_embedding_vector_workspace_idx
  ON kb_embedding_vector ("workspaceId", provider, model);

CREATE TABLE IF NOT EXISTS memory_embedding_vector (
  id TEXT PRIMARY KEY,
  "memoryId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding vector NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("memoryId", provider, model)
);

CREATE INDEX IF NOT EXISTS memory_embedding_vector_workspace_idx
  ON memory_embedding_vector ("workspaceId", provider, model);
