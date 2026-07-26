"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authInputClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { mediaKindFromMime } from "@/lib/website/media-kind";
import type {
  MediaKind,
  MediaUsageRef,
  WebsiteMedia,
  WebsiteMediaFolder,
} from "@/lib/website/types";
import { Toast } from "@/components/website/ui/toast";
import { MediaDetailPanel } from "@/components/website/media/media-detail-panel";
import { MediaEditorModal } from "@/components/website/media/media-editor-modal";
import {
  formatBytes,
  isAudioMedia,
  isImageMedia,
  isPdfMedia,
  isVideoMedia,
  KIND_FILTERS,
  previewUrl,
  type ViewMode,
} from "@/components/website/media/media-helpers";
import {
  MediaEmptyIllustration,
  MediaSkeleton,
} from "@/components/website/media/media-skeleton";
import { MediaUploader } from "@/components/website/media/media-uploader";

const PAGE_SIZE = 48;

export function MediaLibrary({
  siteId,
  media: initialMedia,
  folders: initialFolders = [],
  canManage,
}: {
  siteId: string;
  media: WebsiteMedia[];
  folders?: WebsiteMediaFolder[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [media, setMedia] = useState(initialMedia);
  const [folders, setFolders] = useState(initialFolders);
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<MediaKind | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "size" | "used">(
    "newest",
  );
  const [folderId, setFolderId] = useState<string | null | "unfiled" | "all">(
    "all",
  );
  const [showFavorites, setShowFavorites] = useState(false);
  const [showRecentUsed, setShowRecentUsed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [usages, setUsages] = useState<MediaUsageRef[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(initialMedia.length);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [folderName, setFolderName] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const selected = media.find((item) => item.id === selectedId) ?? null;
  const checkedCount = checkedIds.length;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (kind !== "all") params.set("kind", kind);
      if (sort) params.set("sort", sort);
      if (showFavorites) params.set("favorited", "1");
      if (showRecentUsed) params.set("recent", "used");
      if (folderId === "unfiled") params.set("folderId", "unfiled");
      else if (folderId && folderId !== "all") params.set("folderId", folderId);

      const response = await fetch(
        `/api/website/sites/${siteId}/media?${params.toString()}`,
      );
      const data = (await response.json()) as {
        error?: string;
        media?: WebsiteMedia[];
        folders?: WebsiteMediaFolder[];
        total?: number;
      };
      if (!response.ok) throw new Error(data.error || "Unable to load media.");
      setMedia(data.media ?? []);
      setTotal(data.total ?? data.media?.length ?? 0);
      if (data.folders) setFolders(data.folders);
      setVisibleCount(PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load media.");
    } finally {
      setLoading(false);
    }
  }, [folderId, kind, query, showFavorites, showRecentUsed, siteId, sort]);

  useEffect(() => {
    setMedia(initialMedia);
    setFolders(initialFolders);
    setTotal(initialMedia.length);
  }, [initialMedia, initialFolders]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refresh();
    }, 220);
    return () => window.clearTimeout(handle);
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setUsages([]);
      setUsageCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      const response = await fetch(
        `/api/website/sites/${siteId}/media/${selectedId}`,
      );
      const data = (await response.json()) as {
        usages?: MediaUsageRef[];
        usageCount?: number;
        media?: WebsiteMedia;
      };
      if (cancelled) return;
      setUsages(data.usages ?? []);
      setUsageCount(data.usageCount ?? 0);
      if (data.media) {
        setMedia((current) =>
          current.map((item) => (item.id === data.media!.id ? data.media! : item)),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, siteId]);

  const visibleMedia = useMemo(
    () => media.slice(0, visibleCount),
    [media, visibleCount],
  );

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (visibleCount >= media.length) return;
        setLoadingMore(true);
        window.setTimeout(() => {
          setVisibleCount((count) => Math.min(media.length, count + PAGE_SIZE));
          setLoadingMore(false);
        }, 120);
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [media.length, visibleCount]);

  async function patchMedia(
    mediaId: string,
    body: Record<string, unknown>,
  ): Promise<WebsiteMedia | null> {
    const response = await fetch(
      `/api/website/sites/${siteId}/media/${mediaId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = (await response.json()) as {
      error?: string;
      media?: WebsiteMedia;
    };
    if (!response.ok || !data.media) {
      setToast({
        message: data.error || "Unable to update asset.",
        tone: "error",
      });
      return null;
    }
    setMedia((current) =>
      current.map((item) => (item.id === data.media!.id ? data.media! : item)),
    );
    return data.media;
  }

  async function removeMedia(mediaId: string, force = false) {
    const response = await fetch(
      `/api/website/sites/${siteId}/media/${mediaId}${force ? "?force=1" : ""}`,
      { method: "DELETE" },
    );
    const data = (await response.json()) as {
      error?: string;
      usages?: MediaUsageRef[];
      usageCount?: number;
    };
    if (response.status === 409) {
      const names = (data.usages ?? []).map((u) => u.label).join(", ");
      const proceed = window.confirm(
        `${data.error}\n\nUsed in: ${names || "multiple places"}\n\nForce delete anyway?`,
      );
      if (proceed) return removeMedia(mediaId, true);
      setToast({
        message: "Delete cancelled — asset is in use.",
        tone: "error",
      });
      return;
    }
    if (!response.ok) {
      setToast({
        message: data.error || "Unable to delete media.",
        tone: "error",
      });
      return;
    }
    setMedia((current) => current.filter((item) => item.id !== mediaId));
    setSelectedId(null);
    setToast({ message: "Asset deleted.", tone: "success" });
    router.refresh();
  }

  async function createFolder() {
    const name = folderName.trim();
    if (!name) return;
    const response = await fetch(
      `/api/website/sites/${siteId}/media/folders`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      },
    );
    const data = (await response.json()) as {
      error?: string;
      folder?: WebsiteMediaFolder;
    };
    if (!response.ok || !data.folder) {
      setToast({
        message: data.error || "Unable to create folder.",
        tone: "error",
      });
      return;
    }
    setFolders((current) => [...current, data.folder!]);
    setFolderName("");
    setToast({ message: "Folder created.", tone: "success" });
  }

  async function renameFolder(folder: WebsiteMediaFolder) {
    const next = window.prompt("Rename folder", folder.name);
    if (!next || !next.trim() || next.trim() === folder.name) return;
    const response = await fetch(
      `/api/website/sites/${siteId}/media/folders/${folder.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next.trim() }),
      },
    );
    const data = (await response.json()) as {
      error?: string;
      folder?: WebsiteMediaFolder;
    };
    if (!response.ok || !data.folder) {
      setToast({
        message: data.error || "Unable to rename folder.",
        tone: "error",
      });
      return;
    }
    setFolders((current) =>
      current.map((item) => (item.id === data.folder!.id ? data.folder! : item)),
    );
  }

  async function deleteFolder(folder: WebsiteMediaFolder) {
    if (
      !window.confirm(
        `Delete folder “${folder.name}”? Assets will move to Unfiled.`,
      )
    ) {
      return;
    }
    const response = await fetch(
      `/api/website/sites/${siteId}/media/folders/${folder.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast({
        message: data.error || "Unable to delete folder.",
        tone: "error",
      });
      return;
    }
    setFolders((current) => current.filter((item) => item.id !== folder.id));
    if (folderId === folder.id) setFolderId("all");
    void refresh();
  }

  function toggleChecked(id: string) {
    setCheckedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function runBulk(
    action: "delete" | "favorite" | "unfavorite" | "move",
    options: { folderId?: string | null; force?: boolean } = {},
  ) {
    if (!canManage || checkedIds.length === 0) return;
    if (action === "delete") {
      const confirmed = window.confirm(
        `Delete ${checkedIds.length} selected asset${checkedIds.length === 1 ? "" : "s"}?`,
      );
      if (!confirmed) return;
    }
    setBulkPending(true);
    try {
      const response = await fetch(`/api/website/sites/${siteId}/media/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          mediaIds: checkedIds,
          folderId: options.folderId,
          force: options.force,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        processed?: number;
        blocked?: Array<{ mediaId: string; usageCount: number }>;
      };
      if (!response.ok) {
        if (
          response.status === 409 &&
          action === "delete" &&
          !options.force
        ) {
          const force = window.confirm(
            `${data.error || "Some assets are in use."} Force delete anyway?`,
          );
          if (force) {
            setBulkPending(false);
            await runBulk("delete", { force: true });
            return;
          }
        }
        throw new Error(data.error || "Bulk action failed.");
      }
      setCheckedIds([]);
      setToast({
        message: `${data.processed ?? 0} asset${(data.processed ?? 0) === 1 ? "" : "s"} updated ✓`,
        tone: "success",
      });
      void refresh();
      router.refresh();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Bulk action failed.",
        tone: "error",
      });
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Media Library
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Central asset manager for this site — images, video, audio, documents,
            and icons.
          </p>
        </div>
        <p className="text-xs text-zinc-400">
          {total} asset{total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_380px]">
        <aside className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Browse
            </p>
            <div className="mt-2 space-y-1">
              {(
                [
                  ["all", "All assets", false, false],
                  ["favorites", "Favorites", true, false],
                  ["recent", "Recently used", false, true],
                ] as const
              ).map(([id, label, fav, recent]) => {
                const active =
                  id === "all"
                    ? folderId === "all" && !showFavorites && !showRecentUsed
                    : id === "favorites"
                      ? showFavorites
                      : showRecentUsed;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                    onClick={() => {
                      setShowFavorites(fav);
                      setShowRecentUsed(recent);
                      setFolderId("all");
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Folders
              </p>
            </div>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                className={`flex w-full rounded-lg px-3 py-2 text-left text-sm ${
                  folderId === "unfiled"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
                onClick={() => {
                  setFolderId("unfiled");
                  setShowFavorites(false);
                  setShowRecentUsed(false);
                }}
              >
                Unfiled
              </button>
              {folders.map((folder) => (
                <div key={folder.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm ${
                      folderId === folder.id
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                    onClick={() => {
                      setFolderId(folder.id);
                      setShowFavorites(false);
                      setShowRecentUsed(false);
                    }}
                  >
                    {folder.name}
                  </button>
                  {canManage ? (
                    <div className="hidden shrink-0 group-hover:flex">
                      <button
                        type="button"
                        className="rounded px-1.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
                        onClick={() => void renameFolder(folder)}
                        title="Rename"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="rounded px-1.5 py-1 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => void deleteFolder(folder)}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {canManage ? (
              <div className="mt-3 flex gap-2">
                <input
                  className={`${authInputClassName} !py-1.5 text-xs`}
                  placeholder="New folder"
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void createFolder();
                  }}
                />
                <button
                  type="button"
                  className={`${authSecondaryButtonClassName} !w-auto px-2 py-1.5 text-xs`}
                  onClick={() => void createFolder()}
                >
                  Add
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${authInputClassName} max-w-sm !py-2`}
                placeholder="Search assets…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target.value as
                      | "newest"
                      | "oldest"
                      | "name"
                      | "size"
                      | "used",
                  )
                }
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="used">Recently used</option>
              </select>
              <div className="ml-auto flex rounded-lg border border-zinc-200 p-0.5">
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-xs ${
                    view === "grid"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600"
                  }`}
                  onClick={() => setView("grid")}
                >
                  Grid
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-xs ${
                    view === "list"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600"
                  }`}
                  onClick={() => setView("list")}
                >
                  List
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {KIND_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    kind === filter.id
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                  onClick={() => setKind(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {canManage ? (
            <MediaUploader
              siteId={siteId}
              folderId={
                folderId && folderId !== "all" && folderId !== "unfiled"
                  ? folderId
                  : null
              }
              canManage={canManage}
              onComplete={(uploaded) => {
                setMedia((current) => [...uploaded, ...current]);
                setToast({
                  message:
                    uploaded.length === 1
                      ? "Upload complete ✓"
                      : `${uploaded.length} files uploaded ✓`,
                  tone: "success",
                });
                router.refresh();
              }}
            />
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              <button
                type="button"
                className="mt-2 text-xs font-medium underline"
                onClick={() => void refresh()}
              >
                Retry
              </button>
            </div>
          ) : null}

          {canManage && checkedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
              <span className="font-medium text-zinc-800">
                {checkedCount} selected
              </span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-white"
                disabled={bulkPending}
                onClick={() => void runBulk("favorite")}
              >
                Favorite
              </button>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-white"
                disabled={bulkPending}
                onClick={() => void runBulk("unfavorite")}
              >
                Unfavorite
              </button>
              <select
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs"
                disabled={bulkPending}
                defaultValue=""
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  void runBulk("move", {
                    folderId: value === "unfiled" ? null : value,
                  });
                  event.currentTarget.value = "";
                }}
              >
                <option value="">Move to…</option>
                <option value="unfiled">Unfiled</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-white"
                disabled={bulkPending}
                onClick={() => void runBulk("delete")}
              >
                {bulkPending ? "Working…" : "Delete"}
              </button>
              <button
                type="button"
                className="ml-auto rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-white"
                onClick={() => setCheckedIds([])}
              >
                Clear
              </button>
            </div>
          ) : null}

          {loading && media.length === 0 ? (
            <MediaSkeleton view={view} />
          ) : media.length === 0 ? (
            <MediaEmptyIllustration
              title="Your media library is empty"
              description="Upload logos, hero images, product photos, videos, audio, documents, and icons. Organize them into folders and reuse them across Website Builder and future modules."
              action={
                canManage ? (
                  <span className="text-xs text-zinc-500">
                    Drag files into the uploader above to get started.
                  </span>
                ) : null
              }
            />
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visibleMedia.map((item) => {
                const active = item.id === selectedId;
                const kindLabel = mediaKindFromMime(
                  item.mimeType,
                  item.originalName,
                );
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`group overflow-hidden rounded-xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      active
                        ? "border-zinc-900 ring-2 ring-zinc-900/15"
                        : checkedIds.includes(item.id)
                          ? "border-zinc-400"
                          : "border-zinc-200"
                    }`}
                  >
                    <div className="relative aspect-square bg-zinc-50">
                      {isImageMedia(item) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewUrl(item, "thumbnail")}
                          alt={item.alt || item.originalName}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : isVideoMedia(item) ? (
                        <video
                          src={previewUrl(item)}
                          muted
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : isAudioMedia(item) ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                          <span className="text-2xl" aria-hidden>
                            ♪
                          </span>
                          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            Audio
                          </span>
                        </div>
                      ) : isPdfMedia(item) ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                          <span className="rounded bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                            PDF
                          </span>
                          <span className="line-clamp-2 text-[11px] text-zinc-500">
                            {item.originalName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-medium uppercase tracking-wide text-zinc-500">
                          {kindLabel}
                        </div>
                      )}
                      {canManage ? (
                        <label
                          className="absolute left-2 top-2 rounded bg-white/90 p-1 shadow-sm"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={checkedIds.includes(item.id)}
                            onChange={() => toggleChecked(item.id)}
                            aria-label={`Select ${item.originalName}`}
                          />
                        </label>
                      ) : null}
                      {item.favorited ? (
                        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-amber-300">
                          ★
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1 p-2.5">
                      <p className="truncate text-xs font-medium text-zinc-900">
                        {item.originalName}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {formatBytes(item.sizeBytes)}
                        {item.width && item.height
                          ? ` · ${item.width}×${item.height}`
                          : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Size</th>
                    <th className="px-3 py-2 font-medium">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMedia.map((item) => (
                    <tr
                      key={item.id}
                      className={`cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 ${
                        item.id === selectedId ? "bg-zinc-50" : ""
                      }`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-md bg-zinc-100">
                            {isImageMedia(item) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={previewUrl(item, "thumbnail")}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <span className="truncate font-medium text-zinc-900">
                            {item.favorited ? "★ " : ""}
                            {item.originalName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {mediaKindFromMime(item.mimeType, item.originalName)}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {formatBytes(item.sizeBytes)}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div ref={sentinelRef} className="h-4" />
          {loadingMore ? (
            <p className="text-center text-xs text-zinc-400">Loading more…</p>
          ) : null}
        </section>

        <div
          className={`${
            selected
              ? "fixed inset-0 z-40 bg-white lg:static lg:z-auto lg:block lg:bg-transparent"
              : "hidden xl:block"
          }`}
        >
          {selected ? (
            <MediaDetailPanel
              item={selected}
              folders={folders}
              usages={usages}
              usageCount={usageCount}
              canManage={canManage}
              onClose={() => setSelectedId(null)}
              onFavorite={() =>
                void patchMedia(selected.id, {
                  favorited: !selected.favorited,
                })
              }
              onRename={(name) =>
                void patchMedia(selected.id, { originalName: name })
              }
              onMove={(nextFolderId) =>
                void patchMedia(selected.id, { folderId: nextFolderId })
              }
              onDelete={() => void removeMedia(selected.id)}
              onEdit={() => setEditing(true)}
              onReplace={() => setReplacing(true)}
              onToast={(message, tone = "success") =>
                setToast({ message, tone })
              }
            />
          ) : (
            <div className="hidden h-full rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-sm text-zinc-500 xl:flex xl:items-center xl:justify-center">
              Select an asset to preview details, usage, and editing tools.
            </div>
          )}
        </div>
      </div>

      {editing && selected ? (
        <MediaEditorModal
          siteId={siteId}
          item={selected}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setMedia((current) =>
              current.map((item) => (item.id === next.id ? next : item)),
            );
            setToast({ message: "Image updated.", tone: "success" });
            router.refresh();
          }}
        />
      ) : null}

      {replacing && selected && canManage ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900">Replace file</h3>
              <button
                type="button"
                className="text-sm text-zinc-500"
                onClick={() => setReplacing(false)}
              >
                Close
              </button>
            </div>
            <MediaUploader
              siteId={siteId}
              replaceMediaId={selected.id}
              canManage={canManage}
              compact
              onComplete={(uploaded) => {
                if (uploaded[0]) {
                  setMedia((current) =>
                    current.map((item) =>
                      item.id === uploaded[0]!.id ? uploaded[0]! : item,
                    ),
                  );
                  setToast({ message: "File replaced.", tone: "success" });
                  setReplacing(false);
                  router.refresh();
                }
              }}
            />
          </div>
        </div>
      ) : null}

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
