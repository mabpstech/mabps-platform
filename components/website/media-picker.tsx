"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { WebsiteMedia } from "@/lib/website/types";
import { MEDIA_SIZE_HINTS } from "@/components/website/ui/labels";

type SizeHint = keyof typeof MEDIA_SIZE_HINTS;

export function MediaPicker({
  siteId,
  value,
  onChange,
  disabled,
  label = "Image",
  hint = "hero",
  accept = "image/*,video/mp4,video/webm",
}: {
  siteId: string;
  value: string | null;
  onChange: (mediaId: string | null) => void;
  disabled?: boolean;
  label?: string;
  hint?: SizeHint;
  accept?: string;
}) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<WebsiteMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [objectFit, setObjectFit] = useState<"cover" | "contain">("cover");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/website/sites/${siteId}/media`);
      const data = (await response.json()) as {
        error?: string;
        media?: WebsiteMedia[];
      };
      if (!response.ok) throw new Error(data.error || "Unable to load media.");
      setMedia(data.media ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load media.");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (open) void loadMedia();
  }, [open, loadMedia]);

  async function uploadFile(file: File) {
    if (disabled) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("alt", file.name);
      const response = await fetch(`/api/website/sites/${siteId}/media`, {
        method: "POST",
        body,
      });
      const data = (await response.json()) as {
        error?: string;
        media?: WebsiteMedia;
      };
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      if (data.media) {
        setMedia((current) => [data.media!, ...current]);
        onChange(data.media.id);
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  const previewUrl = value ? `/api/website/media/file/${value}` : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-zinc-700">{label}</label>
        <span className="text-xs text-zinc-400">{MEDIA_SIZE_HINTS[hint]}</span>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className={`h-40 w-full ${objectFit === "cover" ? "object-cover" : "object-contain"}`}
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 bg-white p-3">
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs`}
              onClick={() => setOpen(true)}
              disabled={disabled}
            >
              Replace
            </button>
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs text-red-700`}
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              Remove
            </button>
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5">
              <button
                type="button"
                className={`rounded-md px-2 py-1 text-xs ${objectFit === "cover" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
                onClick={() => setObjectFit("cover")}
              >
                Crop
              </button>
              <button
                type="button"
                className={`rounded-md px-2 py-1 text-xs ${objectFit === "contain" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
                onClick={() => setObjectFit("contain")}
              >
                Fit
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center transition ${
            dragOver
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50"
          } disabled:opacity-60`}
        >
          <span className="text-sm font-medium text-zinc-900">
            Upload or choose from library
          </span>
          <span className="mt-1 text-xs text-zinc-500">
            Drag & drop an image here
          </span>
        </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal
            aria-label="Media library"
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">
                  Media library
                </h3>
                <p className="text-xs text-zinc-500">{MEDIA_SIZE_HINTS[hint]}</p>
              </div>
              <button
                type="button"
                className="text-sm text-zinc-500 hover:text-zinc-900"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-3">
              <label
                className={`${authButtonClassName} !w-auto cursor-pointer px-4 py-2`}
              >
                {uploading ? "Uploading…" : "Upload"}
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept={accept}
                  disabled={uploading || disabled}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile(file);
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3 py-2`}
                onClick={() => void loadMedia()}
              >
                Refresh
              </button>
            </div>

            {error ? (
              <p className="px-5 py-2 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {loading ? (
                <p className="text-sm text-zinc-500">Loading media…</p>
              ) : media.length === 0 ? (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`rounded-xl border border-dashed px-6 py-16 text-center text-sm text-zinc-500 ${
                    dragOver ? "border-zinc-900 bg-zinc-50" : "border-zinc-300"
                  }`}
                >
                  No files yet. Upload your first image.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {media.map((item) => {
                    const selected = item.id === value;
                    const isImage = item.mimeType.startsWith("image/");
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onChange(item.id);
                          setOpen(false);
                        }}
                        className={`overflow-hidden rounded-xl border text-left transition ${
                          selected
                            ? "border-zinc-900 ring-2 ring-zinc-900/20"
                            : "border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/website/media/file/${item.id}`}
                            alt={item.alt || item.originalName}
                            className="h-28 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-28 items-center justify-center bg-zinc-50 text-xs text-zinc-500">
                            File
                          </div>
                        )}
                        <div className="truncate px-2 py-2 text-xs text-zinc-700">
                          {item.originalName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
