"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  authButtonClassName,
  authInputClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type {
  WebsiteMedia,
  WebsiteMediaFolder,
} from "@/lib/website/types";
import { MEDIA_SIZE_HINTS } from "@/components/website/ui/labels";
import {
  formatBytes,
  isImageMedia,
  KIND_FILTERS,
  MEDIA_ACCEPT_ATTR,
  previewUrl,
  type LibraryTab,
} from "@/components/website/media/media-helpers";
import {
  MediaEmptyIllustration,
  MediaSkeleton,
} from "@/components/website/media/media-skeleton";
import { MediaUploader } from "@/components/website/media/media-uploader";
import { mediaKindFromMime } from "@/lib/website/media-kind";

type SizeHint = keyof typeof MEDIA_SIZE_HINTS;

export function MediaPicker({
  siteId,
  value,
  onChange,
  disabled,
  label = "Image",
  hint = "hero",
  accept = MEDIA_ACCEPT_ATTR,
  multiple = false,
  values,
  onChangeMultiple,
}: {
  siteId: string;
  value: string | null;
  onChange: (mediaId: string | null) => void;
  disabled?: boolean;
  label?: string;
  hint?: SizeHint;
  accept?: string;
  multiple?: boolean;
  values?: string[];
  onChangeMultiple?: (mediaIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LibraryTab>("library");
  const [media, setMedia] = useState<WebsiteMedia[]>([]);
  const [folders, setFolders] = useState<WebsiteMediaFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [folderId, setFolderId] = useState<string | "all" | "unfiled">("all");
  const [kind, setKind] = useState<(typeof KIND_FILTERS)[number]["id"]>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    multiple ? values ?? (value ? [value] : []) : value ? [value] : [],
  );
  const [objectFit, setObjectFit] = useState<"cover" | "contain">("cover");
  const [dragOver, setDragOver] = useState(false);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (kind !== "all") params.set("kind", kind);
      if (tab === "favorites") params.set("favorited", "1");
      if (tab === "recent") params.set("recent", "used");
      if (folderId === "unfiled") params.set("folderId", "unfiled");
      else if (folderId !== "all") params.set("folderId", folderId);
      if (tab === "recent") params.set("sort", "used");

      const response = await fetch(
        `/api/website/sites/${siteId}/media?${params.toString()}`,
      );
      const data = (await response.json()) as {
        error?: string;
        media?: WebsiteMedia[];
        folders?: WebsiteMediaFolder[];
      };
      if (!response.ok) throw new Error(data.error || "Unable to load media.");
      setMedia(data.media ?? []);
      if (data.folders) setFolders(data.folders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load media.");
    } finally {
      setLoading(false);
    }
  }, [folderId, kind, query, siteId, tab]);

  useEffect(() => {
    if (open) void loadMedia();
  }, [open, loadMedia]);

  useEffect(() => {
    if (multiple) {
      setSelectedIds(values ?? []);
    } else {
      setSelectedIds(value ? [value] : []);
    }
  }, [multiple, value, values]);

  const previewId = multiple ? selectedIds[0] ?? null : value;
  const previewUrlValue = previewId
    ? `/api/website/media/file/${previewId}`
    : null;

  const filteredAcceptHint = useMemo(() => {
    if (accept.includes("image") && !accept.includes("video")) {
      return "Images";
    }
    return "Media files";
  }, [accept]);

  function toggleSelect(id: string) {
    if (multiple) {
      setSelectedIds((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      );
      return;
    }
    setSelectedIds([id]);
  }

  async function confirmSelection() {
    if (multiple) {
      onChangeMultiple?.(selectedIds);
      for (const id of selectedIds) {
        void fetch(`/api/website/sites/${siteId}/media/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markUsed: true }),
        });
      }
      onChange(selectedIds[0] ?? null);
      setOpen(false);
      return;
    }
    const id = selectedIds[0] ?? null;
    onChange(id);
    if (id) {
      void fetch(`/api/website/sites/${siteId}/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markUsed: true }),
      });
    }
    setOpen(false);
  }

  const tabs: Array<{ id: LibraryTab; label: string }> = [
    { id: "upload", label: "Upload" },
    { id: "library", label: "Media Library" },
    { id: "recent", label: "Recent" },
    { id: "favorites", label: "Favorites" },
    { id: "folders", label: "Folders" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-zinc-700">{label}</label>
        <span className="text-xs text-zinc-400">{MEDIA_SIZE_HINTS[hint]}</span>
      </div>

      {previewUrlValue ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrlValue}
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
              onClick={() => {
                onChange(null);
                onChangeMultiple?.([]);
              }}
              disabled={disabled}
            >
              Remove
            </button>
            {multiple && selectedIds.length > 1 ? (
              <span className="text-xs text-zinc-500">
                {selectedIds.length} selected
              </span>
            ) : null}
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
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            setOpen(true);
            setTab("upload");
          }}
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
            Drag & drop {filteredAcceptHint.toLowerCase()} here
          </span>
        </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-3 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal
            aria-label="Media library"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">
                  Choose media
                </h3>
                <p className="text-xs text-zinc-500">
                  {MEDIA_SIZE_HINTS[hint]}
                  {multiple ? " · Select multiple" : ""}
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-zinc-500 hover:text-zinc-900"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 px-4 py-2">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${
                    tab === item.id
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab !== "upload" ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-3">
                <input
                  className={`${authInputClassName} max-w-xs !py-1.5 text-sm`}
                  placeholder="Search…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {tab === "folders" || tab === "library" ? (
                  <select
                    className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    value={folderId}
                    onChange={(event) =>
                      setFolderId(
                        event.target.value as string | "all" | "unfiled",
                      )
                    }
                  >
                    <option value="all">All folders</option>
                    <option value="unfiled">Unfiled</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <div className="flex flex-wrap gap-1">
                  {KIND_FILTERS.slice(0, 5).map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        kind === filter.id
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                      onClick={() => setKind(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="px-5 py-2 text-sm text-red-600">
                {error}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void loadMedia()}
                >
                  Retry
                </button>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "upload" ? (
                <MediaUploader
                  siteId={siteId}
                  canManage={!disabled}
                  folderId={
                    folderId !== "all" && folderId !== "unfiled"
                      ? folderId
                      : null
                  }
                  onComplete={(uploaded) => {
                    setMedia((current) => [...uploaded, ...current]);
                    if (!multiple && uploaded[0]) {
                      onChange(uploaded[0].id);
                      setOpen(false);
                    } else if (multiple) {
                      const ids = uploaded.map((item) => item.id);
                      setSelectedIds((current) => [...current, ...ids]);
                      setTab("library");
                    }
                  }}
                />
              ) : loading ? (
                <MediaSkeleton count={9} />
              ) : media.length === 0 ? (
                <MediaEmptyIllustration
                  title="No matching assets"
                  description="Try another folder, clear filters, or upload a new file."
                  action={
                    <button
                      type="button"
                      className={`${authButtonClassName} !w-auto px-4`}
                      onClick={() => setTab("upload")}
                    >
                      Upload
                    </button>
                  }
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {media.map((item) => {
                    const selected = selectedIds.includes(item.id);
                    const kindLabel = mediaKindFromMime(
                      item.mimeType,
                      item.originalName,
                    );
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleSelect(item.id)}
                        onDoubleClick={() => {
                          if (!multiple) {
                            onChange(item.id);
                            void fetch(
                              `/api/website/sites/${siteId}/media/${item.id}`,
                              {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ markUsed: true }),
                              },
                            );
                            setOpen(false);
                          }
                        }}
                        className={`overflow-hidden rounded-xl border text-left transition ${
                          selected
                            ? "border-zinc-900 ring-2 ring-zinc-900/20"
                            : "border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        {isImageMedia(item) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl(item, "thumbnail")}
                            alt={item.alt || item.originalName}
                            loading="lazy"
                            className="h-28 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-28 items-center justify-center bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                            {kindLabel}
                          </div>
                        )}
                        <div className="space-y-0.5 px-2 py-2">
                          <div className="truncate text-xs font-medium text-zinc-700">
                            {item.favorited ? "★ " : ""}
                            {item.originalName}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {formatBytes(item.sizeBytes)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {tab !== "upload" ? (
              <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3">
                <p className="text-xs text-zinc-500">
                  {selectedIds.length
                    ? `${selectedIds.length} selected`
                    : "Select an asset"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`${authSecondaryButtonClassName} !w-auto px-4`}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`${authButtonClassName} !w-auto px-4`}
                    disabled={!selectedIds.length}
                    onClick={() => void confirmSelection()}
                  >
                    {multiple ? "Use selected" : "Use asset"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
