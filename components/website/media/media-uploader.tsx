"use client";

import { useCallback, useRef, useState } from "react";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { WebsiteMedia } from "@/lib/website/types";
import {
  formatBytes,
  MEDIA_ACCEPT_ATTR,
  type UploadQueueItem,
} from "@/components/website/media/media-helpers";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useUploadQueue({
  siteId,
  folderId,
  replaceMediaId,
  onComplete,
}: {
  siteId: string;
  folderId?: string | null;
  replaceMediaId?: string | null;
  onComplete?: (media: WebsiteMedia[]) => void;
}) {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const busy = items.some(
    (item) => item.status === "uploading" || item.status === "queued",
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<UploadQueueItem>) => {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const uploadOne = useCallback(
    async (item: UploadQueueItem) => {
      const abort = new AbortController();
      updateItem(item.id, {
        status: "uploading",
        progress: 8,
        abort,
        error: undefined,
      });

      try {
        const body = new FormData();
        body.append("file", item.file);
        body.append("alt", item.file.name);
        if (folderId) body.append("folderId", folderId);
        if (replaceMediaId) body.append("replaceMediaId", replaceMediaId);

        // XMLHttpRequest for real progress events.
        const media = await new Promise<WebsiteMedia>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `/api/website/sites/${siteId}/media`);
          xhr.responseType = "json";
          abort.signal.addEventListener("abort", () => {
            xhr.abort();
            reject(new Error("Upload cancelled."));
          });
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const pct = Math.max(
              8,
              Math.min(96, Math.round((event.loaded / event.total) * 100)),
            );
            updateItem(item.id, { progress: pct });
          };
          xhr.onload = () => {
            const data = xhr.response as {
              error?: string;
              media?: WebsiteMedia;
            };
            if (xhr.status >= 200 && xhr.status < 300 && data?.media) {
              resolve(data.media);
              return;
            }
            reject(new Error(data?.error || "Upload failed."));
          };
          xhr.onerror = () => reject(new Error("Network error during upload."));
          xhr.send(body);
        });

        updateItem(item.id, {
          status: "done",
          progress: 100,
          media,
          abort: undefined,
        });
        return media;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed.";
        const cancelled = message.includes("cancelled");
        updateItem(item.id, {
          status: cancelled ? "cancelled" : "error",
          error: message,
          abort: undefined,
        });
        return null;
      }
    },
    [folderId, replaceMediaId, siteId, updateItem],
  );

  const enqueue = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      const queued: UploadQueueItem[] = list.map((file) => ({
        id: newId(),
        file,
        progress: 0,
        status: "queued" as const,
      }));
      setItems((current) => [...queued, ...current]);

      const completed: WebsiteMedia[] = [];
      for (const item of queued) {
        const media = await uploadOne(item);
        if (media) completed.push(media);
      }
      if (completed.length) onComplete?.(completed);
    },
    [onComplete, uploadOne],
  );

  const cancel = useCallback(
    (id: string) => {
      setItems((current) => {
        const target = current.find((item) => item.id === id);
        target?.abort?.abort();
        return current.map((item) =>
          item.id === id
            ? { ...item, status: "cancelled", error: "Upload cancelled." }
            : item,
        );
      });
    },
    [],
  );

  const retry = useCallback(
    async (id: string) => {
      const target = items.find((item) => item.id === id);
      if (!target) return;
      const media = await uploadOne({
        ...target,
        status: "queued",
        progress: 0,
        error: undefined,
      });
      if (media) onComplete?.([media]);
    },
    [items, onComplete, uploadOne],
  );

  const clearFinished = useCallback(() => {
    setItems((current) =>
      current.filter(
        (item) => item.status === "uploading" || item.status === "queued",
      ),
    );
  }, []);

  return { items, busy, enqueue, cancel, retry, clearFinished };
}

export function MediaUploader({
  siteId,
  folderId,
  replaceMediaId,
  canManage,
  compact,
  onComplete,
}: {
  siteId: string;
  folderId?: string | null;
  replaceMediaId?: string | null;
  canManage: boolean;
  compact?: boolean;
  onComplete?: (media: WebsiteMedia[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { items, busy, enqueue, cancel, retry, clearFinished } = useUploadQueue({
    siteId,
    folderId,
    replaceMediaId,
    onComplete,
  });

  if (!canManage) return null;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (event.dataTransfer.files?.length) {
            void enqueue(event.dataTransfer.files);
          }
        }}
        className={`rounded-2xl border border-dashed px-6 text-center transition ${
          compact ? "py-8" : "py-12"
        } ${
          dragOver
            ? "border-zinc-900 bg-zinc-50 scale-[1.01]"
            : "border-zinc-300 bg-white"
        }`}
      >
        <p className="text-sm font-semibold text-zinc-900">
          Drag & drop files here
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Images, video, audio, SVG, PDF · up to 15 MB each · multiple files OK
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <label
            className={`${authButtonClassName} !w-auto cursor-pointer px-4 py-2`}
          >
            {busy ? "Uploading…" : "Choose files"}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              multiple={!replaceMediaId}
              accept={MEDIA_ACCEPT_ATTR}
              disabled={busy && Boolean(replaceMediaId)}
              onChange={(event) => {
                if (event.target.files?.length) {
                  void enqueue(event.target.files);
                }
                event.target.value = "";
              }}
            />
          </label>
          {items.some(
            (item) =>
              item.status === "done" ||
              item.status === "error" ||
              item.status === "cancelled",
          ) ? (
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-3 py-2 text-xs`}
              onClick={clearFinished}
            >
              Clear finished
            </button>
          ) : null}
        </div>
      </div>

      {items.length ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatBytes(item.file.size)}
                    {item.status === "error" || item.status === "cancelled"
                      ? ` · ${item.error}`
                      : item.status === "done"
                        ? " · Uploaded"
                        : item.status === "uploading"
                          ? ` · ${item.progress}%`
                          : " · Waiting"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {item.status === "uploading" ? (
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                      onClick={() => cancel(item.id)}
                    >
                      Cancel
                    </button>
                  ) : null}
                  {item.status === "error" ? (
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs text-zinc-900 hover:bg-zinc-100"
                      onClick={() => void retry(item.id)}
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </div>
              {(item.status === "uploading" || item.status === "queued") && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-zinc-900 transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
