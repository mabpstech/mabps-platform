import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

function uploadsRoot(): string {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "uploads",
  );
}

export function siteUploadDir(workspaceId: string, siteId: string): string {
  return path.join(uploadsRoot(), workspaceId, siteId);
}

export function ensureSiteUploadDir(
  workspaceId: string,
  siteId: string,
): string {
  const dir = siteUploadDir(workspaceId, siteId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function removeSiteUploadDir(
  workspaceId: string,
  siteId: string,
): void {
  const dir = siteUploadDir(workspaceId, siteId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function removeMediaFile(storagePath: string): void {
  const absolute = path.isAbsolute(storagePath)
    ? storagePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), storagePath);
  if (fs.existsSync(absolute)) {
    fs.unlinkSync(absolute);
  }
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "video/mp4",
  "video/webm",
]);

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export function assertAllowedMedia(mimeType: string, sizeBytes: number): void {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error("Unsupported file type.");
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_FILE_BYTES) {
    throw new Error("File must be between 1 byte and 15 MB.");
  }
}

export function extensionForMime(mimeType: string, originalName: string): string {
  const fromName = path.extname(originalName).toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    case "application/pdf":
      return ".pdf";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    default:
      return "";
  }
}

export async function storeMediaFile(input: {
  workspaceId: string;
  siteId: string;
  file: File;
}): Promise<{
  filename: string;
  storagePath: string;
  sizeBytes: number;
  mimeType: string;
  originalName: string;
}> {
  const mimeType = input.file.type || "application/octet-stream";
  const sizeBytes = input.file.size;
  assertAllowedMedia(mimeType, sizeBytes);

  const dir = ensureSiteUploadDir(input.workspaceId, input.siteId);
  const ext = extensionForMime(mimeType, input.file.name);
  const filename = `${randomUUID()}${ext}`;
  const absolute = path.join(dir, filename);
  const buffer = Buffer.from(await input.file.arrayBuffer());
  fs.writeFileSync(absolute, buffer);

  const storagePath = path.relative(
    /* turbopackIgnore: true */ process.cwd(),
    absolute,
  );

  return {
    filename,
    storagePath,
    sizeBytes,
    mimeType,
    originalName: input.file.name || filename,
  };
}

export function resolveMediaAbsolutePath(storagePath: string): string {
  const absolute = path.isAbsolute(storagePath)
    ? storagePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), storagePath);
  if (!absolute.startsWith(uploadsRoot())) {
    throw new Error("Invalid media path.");
  }
  return absolute;
}
