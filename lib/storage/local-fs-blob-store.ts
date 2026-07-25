import fs from "node:fs/promises";
import path from "node:path";
import type { BlobStore } from "@/lib/storage/blob-store";

function cwdRoot(): string {
  return /* turbopackIgnore: true */ process.cwd();
}

function uploadsRoot(): string {
  return path.join(cwdRoot(), "data", "uploads");
}

function resolveKeyAbsolute(key: string): string {
  const absolute = path.isAbsolute(key) ? key : path.join(cwdRoot(), key);
  const root = uploadsRoot();
  const relative = path.relative(root, absolute);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative.includes("\0")
  ) {
    throw new Error("Invalid media path.");
  }
  return absolute;
}

export function createLocalFsBlobStore(): BlobStore {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error(
      "Local filesystem media storage is not supported on Vercel. " +
        "Unset MEDIA_STORAGE_DRIVER (auto db) or set MEDIA_STORAGE_DRIVER=db|s3.",
    );
  }

  return {
    async put(key, body) {
      const absolute = resolveKeyAbsolute(key);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, body);
    },

    async get(key) {
      const absolute = resolveKeyAbsolute(key);
      try {
        return await fs.readFile(absolute);
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return null;
        }
        throw error;
      }
    },

    async delete(key) {
      const absolute = resolveKeyAbsolute(key);
      try {
        await fs.unlink(absolute);
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return;
        }
        throw error;
      }
    },

    async deletePrefix(prefix) {
      const absolute = resolveKeyAbsolute(prefix);
      await fs.rm(absolute, { recursive: true, force: true });
    },

    async exists(key) {
      const absolute = resolveKeyAbsolute(key);
      try {
        await fs.access(absolute);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export { uploadsRoot, resolveKeyAbsolute as resolveLocalMediaAbsolutePath };
