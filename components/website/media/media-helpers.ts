"use client";

import type { MediaKind, WebsiteMedia } from "@/lib/website/types";
import { mediaPublicUrl } from "@/lib/website/media-url";

export type ViewMode = "grid" | "list";
export type LibraryTab =
  | "library"
  | "upload"
  | "recent"
  | "favorites"
  | "folders";

export type UploadQueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error" | "cancelled";
  error?: string;
  media?: WebsiteMedia;
  abort?: AbortController;
};

export function isImageMedia(item: WebsiteMedia): boolean {
  return item.mimeType.startsWith("image/");
}

export function isVideoMedia(item: WebsiteMedia): boolean {
  return item.mimeType.startsWith("video/");
}

export function isAudioMedia(item: WebsiteMedia): boolean {
  return item.mimeType.startsWith("audio/");
}

export function previewUrl(
  item: WebsiteMedia,
  size: "thumbnail" | "medium" | "large" | "original" = "thumbnail",
): string {
  if (isImageMedia(item)) return mediaPublicUrl(item.id, size);
  return mediaPublicUrl(item.id);
}

export function kindLabel(kind: MediaKind): string {
  const map: Record<MediaKind, string> = {
    image: "Images",
    video: "Videos",
    audio: "Audio",
    document: "Documents",
    svg: "SVG",
    icon: "Icons",
    other: "Other",
  };
  return map[kind];
}

export const KIND_FILTERS: Array<{ id: MediaKind | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "audio", label: "Audio" },
  { id: "document", label: "Documents" },
  { id: "svg", label: "SVG" },
  { id: "icon", label: "Icons" },
];

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

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const MEDIA_ACCEPT_ATTR =
  "image/*,application/pdf,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,.svg,.ico";
