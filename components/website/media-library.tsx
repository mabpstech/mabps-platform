"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { EmptyState } from "@/components/website/ui/empty-state";
import { Toast } from "@/components/website/ui/toast";
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
  const [pending, setPending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  async function uploadFile(file: File) {
    if (!canManage) return;
    setPending(true);
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
      setToast({ message: "Upload complete ✓", tone: "success" });
      router.refresh();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Upload failed.",
        tone: "error",
      });
    } finally {
      setPending(false);
    }
  }

  async function remove(mediaId: string) {
    if (!canManage) return;
    if (!window.confirm("Delete this file from your library?")) return;
    const response = await fetch(
      `/api/website/sites/${siteId}/media/${mediaId}`,
      { method: "DELETE" },
    );
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setToast({
        message: data.error || "Unable to delete media.",
        tone: "error",
      });
      return;
    }
    setToast({ message: "File deleted.", tone: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Media
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload logos, photos, and files for your pages and posts.
          </p>
        </div>
        {canManage ? (
          <label className={`${authButtonClassName} !w-auto cursor-pointer px-4`}>
            {pending ? "Uploading…" : "Upload file"}
            <input
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
                event.target.value = "";
              }}
              disabled={pending}
              accept="image/*,application/pdf,video/mp4,video/webm"
            />
          </label>
        ) : null}
      </div>

      {canManage ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void uploadFile(file);
          }}
          className={`rounded-2xl border border-dashed px-6 py-10 text-center transition ${
            dragOver
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-300 bg-white"
          }`}
        >
          <p className="text-sm font-medium text-zinc-900">
            Drag & drop files here
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Logos 512×512 · Heroes 1920×1080 · Products 1200×1200
          </p>
        </div>
      ) : null}

      {media.length === 0 ? (
        <EmptyState
          title="Your media library is empty"
          description="Upload images for logos, heroes, products, and blog covers. You’ll pick them visually — no technical IDs needed."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
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
                  {item.mimeType.startsWith("video/") ? "Video" : "Document"}
                </div>
              )}
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {item.originalName}
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
                      onClick={() => void remove(item.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
