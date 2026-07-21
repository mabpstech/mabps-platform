import path from "node:path";
import { randomUUID } from "node:crypto";
import { getMediaBlobStore } from "@/lib/storage/media-blob-store";

function uploadsRelativeRoot(): string {
  return path.join("data", "uploads");
}

export function siteUploadDir(workspaceId: string, siteId: string): string {
  return path.join(uploadsRelativeRoot(), workspaceId, siteId);
}

export async function ensureSiteUploadDir(
  workspaceId: string,
  siteId: string,
): Promise<string> {
  // Local adapter creates dirs on put; return logical prefix for key building.
  return siteUploadDir(workspaceId, siteId);
}

export async function removeSiteUploadDir(
  workspaceId: string,
  siteId: string,
): Promise<void> {
  const prefix = siteUploadDir(workspaceId, siteId);
  await getMediaBlobStore().deletePrefix(prefix);
}

export async function removeMediaFile(storagePath: string): Promise<void> {
  await getMediaBlobStore().delete(storagePath);
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
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
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
      return ".ico";
    case "application/pdf":
      return ".pdf";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/wav":
      return ".wav";
    case "audio/ogg":
      return ".ogg";
    case "audio/webm":
      return ".weba";
    default:
      return "";
  }
}

export async function storeMediaBuffer(input: {
  workspaceId: string;
  siteId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}): Promise<{
  filename: string;
  storagePath: string;
  sizeBytes: number;
  mimeType: string;
  originalName: string;
}> {
  assertAllowedMedia(input.mimeType, input.buffer.byteLength);
  const dir = await ensureSiteUploadDir(input.workspaceId, input.siteId);
  const ext = extensionForMime(input.mimeType, input.originalName);
  const filename = `${randomUUID()}${ext}`;
  const storagePath = path.join(dir, filename);
  await getMediaBlobStore().put(storagePath, input.buffer, {
    contentType: input.mimeType,
  });
  return {
    filename,
    storagePath,
    sizeBytes: input.buffer.byteLength,
    mimeType: input.mimeType,
    originalName: input.originalName || filename,
  };
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
  buffer: Buffer;
}> {
  const mimeType = input.file.type || "application/octet-stream";
  const sizeBytes = input.file.size;
  assertAllowedMedia(mimeType, sizeBytes);

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const stored = await storeMediaBuffer({
    workspaceId: input.workspaceId,
    siteId: input.siteId,
    buffer,
    mimeType,
    originalName: input.file.name || "upload",
  });

  return { ...stored, buffer };
}

export async function readMediaFile(storagePath: string): Promise<Buffer | null> {
  return getMediaBlobStore().get(storagePath);
}

export async function mediaFileExists(storagePath: string): Promise<boolean> {
  return getMediaBlobStore().exists(storagePath);
}
