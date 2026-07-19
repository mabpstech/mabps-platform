/**
 * Shared Postgres client for dedicated vector storage (P3-5).
 * Uses VECTOR_DATABASE_URL when set; otherwise DATABASE_URL when DATABASE_DRIVER=postgres.
 */

type PgPool = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
  end: () => Promise<void>;
};

let pool: PgPool | null = null;
let schemaReady: Promise<void> | null = null;

export function resolveVectorDatabaseUrl(): string | null {
  const dedicated = process.env.VECTOR_DATABASE_URL?.trim();
  if (dedicated) return dedicated;
  const driver = (process.env.DATABASE_DRIVER || "sqlite").trim().toLowerCase();
  if (
    driver === "postgres" ||
    driver === "postgresql" ||
    driver === "pg"
  ) {
    return process.env.DATABASE_URL?.trim() || null;
  }
  return null;
}

export async function getVectorPgPool(): Promise<PgPool> {
  if (pool) return pool;

  const connectionString = resolveVectorDatabaseUrl();
  if (!connectionString) {
    throw new Error(
      "pgvector store requires VECTOR_DATABASE_URL (or DATABASE_URL with DATABASE_DRIVER=postgres). " +
        "See docs/VECTOR_STORE_PATH.md.",
    );
  }

  let pg: { Pool: new (config: { connectionString: string }) => PgPool };
  try {
    pg = (await import("pg")) as unknown as {
      Pool: new (config: { connectionString: string }) => PgPool;
    };
  } catch {
    throw new Error(
      'The "pg" package is required for MABPS_KB_VECTOR_STORE=pgvector. Run: npm install pg',
    );
  }

  pool = new pg.Pool({ connectionString });
  return pool;
}

const SCHEMA_SQL = `
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
`;

export async function ensurePgvectorSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getVectorPgPool();
      await client.query(SCHEMA_SQL);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}
