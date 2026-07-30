import path from "node:path";
import { randomUUID } from "node:crypto";
import { getMediaBlobStore } from "@/lib/storage/media-blob-store";

function uploadsRelativeRoot(): string {
  // Logical keys always use POSIX separators (DB / S3 / local adapters).
  return path.posix.join("data", "uploads");
}

export function siteUploadDir(workspaceId: string, siteId: string): string {
  return path.posix.join(uploadsRelativeRoot(), workspaceId, siteId);
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
  // SVG intentionally excluded — stored XSS vector when served as image/svg+xml.
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

const MIME_FROM_MAGIC: Array<{ mime: string; test: (buf: Buffer) => boolean }> = [
  {
    mime: "image/jpeg",
    test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    test: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    mime: "image/gif",
    test: (b) => {
      if (b.length < 6) return false;
      const sig = b.subarray(0, 6).toString("ascii");
      return sig === "GIF87a" || sig === "GIF89a";
    },
  },
  {
    mime: "image/webp",
    test: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    mime: "application/pdf",
    test: (b) => b.length >= 5 && b.subarray(0, 5).toString("ascii") === "%PDF-",
  },
  {
    mime: "video/mp4",
    test: (b) =>
      b.length >= 8 &&
      (b.subarray(4, 8).toString("ascii") === "ftyp" ||
        b.subarray(4, 8).toString("ascii") === "mdat"),
  },
  {
    mime: "audio/wav",
    test: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WAVE",
  },
  {
    mime: "audio/ogg",
    test: (b) => b.length >= 4 && b.subarray(0, 4).toString("ascii") === "OggS",
  },
];

/** Resolve MIME from magic bytes when possible; reject SVG / HTML disguises. */
export function detectMediaMime(buffer: Buffer, claimedMime: string): string {
  const head = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8").trimStart();
  if (
    head.startsWith("<svg") ||
    head.startsWith("<?xml") ||
    head.toLowerCase().startsWith("<!doctype html") ||
    head.toLowerCase().startsWith("<html") ||
    claimedMime === "image/svg+xml"
  ) {
    throw new Error("SVG and HTML uploads are not allowed.");
  }

  for (const entry of MIME_FROM_MAGIC) {
    if (entry.test(buffer)) {
      // Allow close aliases (audio/mpeg vs audio/mp3, icon variants).
      if (
        entry.mime === claimedMime ||
        (entry.mime === "audio/ogg" && claimedMime === "audio/ogg") ||
        (entry.mime.startsWith("image/") && claimedMime.startsWith("image/")) ||
        (entry.mime === "video/mp4" && claimedMime === "video/mp4") ||
        (entry.mime === "application/pdf" && claimedMime === "application/pdf") ||
        (entry.mime === "audio/wav" && claimedMime === "audio/wav")
      ) {
        return claimedMime === "audio/mp3" ? "audio/mpeg" : claimedMime;
      }
      // Magic won over a mismatched claim for known binary types.
      if (
        ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"].includes(
          entry.mime,
        )
      ) {
        return entry.mime;
      }
    }
  }

  // ICO / WebM / MPEG lack reliable short magic here — trust allowlisted claim only.
  if (!ALLOWED_MIME.has(claimedMime)) {
    throw new Error("Unsupported file type.");
  }
  return claimedMime;
}

export function assertAllowedMedia(mimeType: string, sizeBytes: number): void {
  if (mimeType === "image/svg+xml") {
    throw new Error("SVG uploads are not allowed.");
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error("Unsupported file type.");
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_FILE_BYTES) {
    throw new Error("File must be between 1 byte and 15 MB.");
  }
}

/** Extension is derived from validated MIME only — never from the client filename. */
export function extensionForMime(mimeType: string, _originalName?: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
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
  const mimeType = detectMediaMime(input.buffer, input.mimeType);
  assertAllowedMedia(mimeType, input.buffer.byteLength);
  const dir = await ensureSiteUploadDir(input.workspaceId, input.siteId);
  const ext = extensionForMime(mimeType);
  const filename = `${randomUUID()}${ext}`;
  const storagePath = path.posix.join(dir, filename);
  await getMediaBlobStore().put(storagePath, input.buffer, {
    contentType: mimeType,
  });
  return {
    filename,
    storagePath,
    sizeBytes: input.buffer.byteLength,
    mimeType,
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
