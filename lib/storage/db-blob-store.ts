import { sqlite } from "@/lib/db";
import type { BlobStore } from "@/lib/storage/blob-store";

const UPLOADS_PREFIX = "data/uploads/";

/** Normalize opaque storage keys to forward-slash paths. */
export function normalizeBlobKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.includes("..") ||
    !normalized.startsWith(UPLOADS_PREFIX)
  ) {
    throw new Error("Invalid media path.");
  }
  return normalized;
}

function toBuffer(value: unknown): Buffer | null {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") {
    // libSQL may return base64 for some blob encodings
    return Buffer.from(value, "base64");
  }
  return null;
}

let tableReady = false;

export function ensureMediaBlobTable(): void {
  if (tableReady) return;
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "media_blob" (
      "key" text not null primary key,
      "contentType" text not null default 'application/octet-stream',
      "bytes" blob not null,
      "sizeBytes" integer not null default 0,
      "createdAt" text not null,
      "updatedAt" text not null
    );
  `);
  tableReady = true;
}

/** Test helper — allow re-ensure after DB reset. */
export function resetMediaBlobTableReadyForTests(): void {
  tableReady = false;
}

/**
 * Store media bytes in the platform database (local SQLite or remote Turso).
 * Safe on Vercel — no local filesystem writes under /var/task.
 */
export function createDbBlobStore(): BlobStore {
  ensureMediaBlobTable();

  return {
    async put(key, body, meta) {
      ensureMediaBlobTable();
      const objectKey = normalizeBlobKey(key);
      const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
      const now = new Date().toISOString();
      sqlite
        .prepare(
          `INSERT INTO "media_blob" (
             "key", "contentType", "bytes", "sizeBytes", "createdAt", "updatedAt"
           ) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT("key") DO UPDATE SET
             "contentType" = excluded."contentType",
             "bytes" = excluded."bytes",
             "sizeBytes" = excluded."sizeBytes",
             "updatedAt" = excluded."updatedAt"`,
        )
        .run(
          objectKey,
          meta.contentType || "application/octet-stream",
          bytes,
          bytes.byteLength,
          now,
          now,
        );
    },

    async get(key) {
      ensureMediaBlobTable();
      const objectKey = normalizeBlobKey(key);
      const row = sqlite
        .prepare(`SELECT "bytes" FROM "media_blob" WHERE "key" = ?`)
        .get(objectKey) as { bytes?: unknown } | undefined;
      if (!row) return null;
      return toBuffer(row.bytes);
    },

    async delete(key) {
      ensureMediaBlobTable();
      const objectKey = normalizeBlobKey(key);
      sqlite.prepare(`DELETE FROM "media_blob" WHERE "key" = ?`).run(objectKey);
    },

    async deletePrefix(prefix) {
      ensureMediaBlobTable();
      const objectPrefix = normalizeBlobKey(prefix).replace(/\/?$/, "/");
      sqlite
        .prepare(`DELETE FROM "media_blob" WHERE "key" LIKE ?`)
        .run(`${objectPrefix}%`);
    },

    async exists(key) {
      ensureMediaBlobTable();
      const objectKey = normalizeBlobKey(key);
      const row = sqlite
        .prepare(`SELECT 1 as ok FROM "media_blob" WHERE "key" = ? LIMIT 1`)
        .get(objectKey) as { ok?: number } | undefined;
      return Boolean(row?.ok);
    },
  };
}
