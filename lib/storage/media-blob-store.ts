import type { BlobStore } from "@/lib/storage/blob-store";
import { resolveMediaStorageDriver } from "@/lib/storage/blob-store";
import { createLocalFsBlobStore } from "@/lib/storage/local-fs-blob-store";
import { createS3BlobStore } from "@/lib/storage/s3-blob-store";

const globalForStore = globalThis as unknown as {
  mediaBlobStore?: BlobStore;
};

export function getMediaBlobStore(): BlobStore {
  if (globalForStore.mediaBlobStore) {
    return globalForStore.mediaBlobStore;
  }

  const driver = resolveMediaStorageDriver();
  const store =
    driver === "s3" ? createS3BlobStore() : createLocalFsBlobStore();

  if (process.env.NODE_ENV !== "production") {
    globalForStore.mediaBlobStore = store;
  } else {
    globalForStore.mediaBlobStore = store;
  }

  return store;
}

/** Test helper / driver flip after env change. */
export function resetMediaBlobStoreForTests(): void {
  delete globalForStore.mediaBlobStore;
}
