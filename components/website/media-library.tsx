"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { WebsiteMedia } from "@/lib/website/types";

export function MediaLibrary({
  siteId,
  media,
  canManage,
}: {
  siteId: string;
  media: WebsiteMedia[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canManage) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("alt", file.name);
      const response = await fetch(`/api/website/sites/${siteId}/media`, {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setMessage("Upload complete.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPending(false);
      event.target.value = "";
    }
  }

  async function remove(mediaId: string) {
    if (!canManage) return;
    if (!window.confirm("Delete this media file?")) return;
    const response = await fetch(
      `/api/website/sites/${siteId}/media/${mediaId}`,
      { method: "DELETE" },
    );
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Unable to delete media.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Media library</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload images and files for pages, blog covers, and theme assets.
          </p>
        </div>
        {canManage ? (
          <label className={`${authButtonClassName} !w-auto cursor-pointer px-4`}>
            {pending ? "Uploading…" : "Upload file"}
            <input
              type="file"
              className="hidden"
              onChange={upload}
              disabled={pending}
              accept="image/*,application/pdf,video/mp4,video/webm"
            />
          </label>
        ) : null}
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {media.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 sm:col-span-2 lg:col-span-3">
            No media uploaded yet.
          </div>
        ) : (
          media.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              {item.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/website/media/file/${item.id}`}
                  alt={item.alt || item.originalName}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-zinc-50 text-sm text-zinc-500">
                  {item.mimeType}
                </div>
              )}
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {item.originalName}
                </p>
                <p className="truncate font-mono text-xs text-zinc-500">
                  {item.id}
                </p>
                <p className="text-xs text-zinc-400">
                  {(item.sizeBytes / 1024).toFixed(1)} KB
                </p>
                <div className="flex gap-2">
                  <a
                    href={`/api/website/media/file/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${authSecondaryButtonClassName} !w-auto px-2 py-1 text-xs`}
                  >
                    Open
                  </a>
                  {canManage ? (
                    <button
                      type="button"
                      className={`${authSecondaryButtonClassName} !w-auto px-2 py-1 text-xs text-red-700`}
                      onClick={() => remove(item.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
