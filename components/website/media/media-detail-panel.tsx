"use client";

import { useState } from "react";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { mediaKindFromMime } from "@/lib/website/media-kind";
import { mediaPublicUrl } from "@/lib/website/media-url";
import type {
  MediaUsageRef,
  WebsiteMedia,
  WebsiteMediaFolder,
} from "@/lib/website/types";
import {
  copyText,
  formatBytes,
  isAudioMedia,
  isImageMedia,
  isVideoMedia,
  previewUrl,
} from "@/components/website/media/media-helpers";

export function MediaDetailPanel({
  item,
  folders,
  usages,
  usageCount,
  canManage,
  onClose,
  onFavorite,
  onRename,
  onMove,
  onDelete,
  onEdit,
  onReplace,
  onToast,
}: {
  item: WebsiteMedia;
  folders: WebsiteMediaFolder[];
  usages: MediaUsageRef[];
  usageCount: number;
  canManage: boolean;
  onClose: () => void;
  onFavorite: () => void;
  onRename: (name: string) => void;
  onMove: (folderId: string | null) => void;
  onDelete: () => void;
  onEdit: () => void;
  onReplace: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${mediaPublicUrl(item.id)}`
      : mediaPublicUrl(item.id);
  const kind = mediaKindFromMime(item.mimeType, item.originalName);
  const [zoom, setZoom] = useState(1);

  return (
    <aside className="flex h-full w-full flex-col border-l border-zinc-200 bg-white lg:w-[380px]">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">Asset details</h3>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative overflow-hidden bg-zinc-950">
          {isImageMedia(item) ? (
            <div className="flex max-h-72 items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl(item, "large")}
                alt={item.alt || item.originalName}
                className="max-h-64 max-w-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          ) : isVideoMedia(item) ? (
            <video
              src={mediaPublicUrl(item.id)}
              controls
              className="max-h-72 w-full bg-black"
            />
          ) : isAudioMedia(item) ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 bg-zinc-900 px-4">
              <p className="text-sm text-zinc-300">Audio file</p>
              <audio src={mediaPublicUrl(item.id)} controls className="w-full" />
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center bg-zinc-100 text-sm text-zinc-500">
              {kind.toUpperCase()} document
            </div>
          )}
          {isImageMedia(item) ? (
            <div className="absolute bottom-3 right-3 flex gap-1 rounded-lg bg-black/60 p-1 backdrop-blur">
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-white hover:bg-white/10"
                onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
              >
                −
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-white hover:bg-white/10"
                onClick={() => setZoom(1)}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-white hover:bg-white/10"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              >
                +
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Filename
            </label>
            {canManage ? (
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                defaultValue={item.originalName}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (next && next !== item.originalName) onRename(next);
                }}
              />
            ) : (
              <p className="mt-1 text-sm text-zinc-900">{item.originalName}</p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-400">Size</dt>
              <dd className="font-medium text-zinc-900">
                {formatBytes(item.sizeBytes)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Format</dt>
              <dd className="font-medium text-zinc-900">
                {item.mimeType.split("/").pop()?.toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Dimensions</dt>
              <dd className="font-medium text-zinc-900">
                {item.width && item.height
                  ? `${item.width} × ${item.height}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Usage</dt>
              <dd className="font-medium text-zinc-900">{usageCount}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-zinc-400">Uploaded by</dt>
              <dd className="font-medium text-zinc-900">
                {item.uploadedByName || "Unknown"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-zinc-400">Upload date</dt>
              <dd className="font-medium text-zinc-900">
                {new Date(item.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Folder
            </label>
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={item.folderId ?? ""}
              disabled={!canManage}
              onChange={(event) =>
                onMove(event.target.value ? event.target.value : null)
              }
            >
              <option value="">Unfiled</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Used in
            </p>
            {usages.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">Not used anywhere yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {usages.map((usage, index) => (
                  <li
                    key={`${usage.kind}-${usage.field}-${index}`}
                    className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                  >
                    <span className="font-medium capitalize text-zinc-900">
                      {usage.kind}
                    </span>
                    <span className="text-zinc-400"> · </span>
                    {usage.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-3 py-2 text-xs`}
              onClick={async () => {
                const ok = await copyText(url);
                onToast(
                  ok ? "URL copied." : "Unable to copy URL.",
                  ok ? "success" : "error",
                );
              }}
            >
              Copy URL
            </button>
            <a
              href={mediaPublicUrl(item.id)}
              download={item.originalName}
              className={`${authSecondaryButtonClassName} !w-auto px-3 py-2 text-xs`}
            >
              Download
            </a>
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-3 py-2 text-xs`}
              onClick={onFavorite}
              disabled={!canManage}
            >
              {item.favorited ? "Unfavorite" : "Favorite"}
            </button>
            {canManage &&
            isImageMedia(item) &&
            item.mimeType !== "image/svg+xml" ? (
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-3 py-2 text-xs`}
                onClick={onEdit}
              >
                Edit image
              </button>
            ) : null}
            {canManage ? (
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3 py-2 text-xs`}
                onClick={onReplace}
              >
                Replace file
              </button>
            ) : null}
            {canManage ? (
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3 py-2 text-xs text-red-700`}
                onClick={onDelete}
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
