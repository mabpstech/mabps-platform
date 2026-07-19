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

export type MediaStorageDriver = "local" | "s3";

export function resolveMediaStorageDriver(): MediaStorageDriver {
  const raw = (process.env.MEDIA_STORAGE_DRIVER || "local").trim().toLowerCase();
  if (raw === "s3" || raw === "r2") return "s3";
  return "local";
}
