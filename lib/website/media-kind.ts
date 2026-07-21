import type { MediaKind } from "@/lib/website/types";

export function mediaKindFromMime(mimeType: string, originalName?: string): MediaKind {
  const mime = mimeType.toLowerCase();
  const name = (originalName || "").toLowerCase();

  if (mime === "image/svg+xml" || name.endsWith(".svg")) return "svg";
  if (mime.startsWith("image/")) {
    if (
      name.includes("icon") ||
      name.endsWith(".ico") ||
      mime === "image/x-icon" ||
      mime === "image/vnd.microsoft.icon"
    ) {
      return "icon";
    }
    return "image";
  }
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime === "application/pdf" ||
    mime.includes("document") ||
    mime.includes("msword") ||
    mime.includes("officedocument") ||
    mime === "text/plain" ||
    mime === "text/csv"
  ) {
    return "document";
  }
  return "other";
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatMimeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WebP",
    "image/gif": "GIF",
    "image/svg+xml": "SVG",
    "application/pdf": "PDF",
    "video/mp4": "MP4",
    "video/webm": "WebM",
    "audio/mpeg": "MP3",
    "audio/wav": "WAV",
    "audio/ogg": "OGG",
  };
  return map[mimeType] || mimeType.split("/").pop()?.toUpperCase() || "FILE";
}
