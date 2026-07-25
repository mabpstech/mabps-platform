/**
 * Opaque blob storage for website media (and future file modules).
 * Keys are relative paths such as `data/uploads/{workspaceId}/{siteId}/{file}`.
 */
export type BlobStore = {
  put(
    key: string,
    body: Buffer | Uint8Array,
    meta: { contentType: string },
  ): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
  exists(key: string): Promise<boolean>;
};

export type MediaStorageDriver = "local" | "db" | "s3";

function isRemoteLibsqlUrl(url: string): boolean {
  return /^(libsql:|https?:\/\/|wss?:\/\/)/i.test(url.trim());
}

/**
 * Resolve media storage backend.
 * - Explicit: MEDIA_STORAGE_DRIVER=local|db|s3|r2|turso
 * - Auto (unset): db on Vercel or remote Turso; local FS for local SQLite dev
 */
export function resolveMediaStorageDriver(): MediaStorageDriver {
  const raw = (process.env.MEDIA_STORAGE_DRIVER || "").trim().toLowerCase();
  if (raw === "s3" || raw === "r2") return "s3";
  if (raw === "db" || raw === "turso" || raw === "libsql") return "db";
  if (raw === "local" || raw === "fs") return "local";

  // Serverless / remote DB cannot persist under /var/task — use Turso BLOB store.
  if (process.env.VERCEL || process.env.VERCEL_ENV) return "db";
  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  if (databaseUrl && isRemoteLibsqlUrl(databaseUrl)) return "db";

  return "local";
}
