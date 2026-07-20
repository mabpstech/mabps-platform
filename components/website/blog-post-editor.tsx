"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { MediaPicker } from "@/components/website/media-picker";
import { StatusBadge } from "@/components/website/ui/empty-state";
import { Toast } from "@/components/website/ui/toast";
import type { WebsiteBlogPost } from "@/lib/website/types";

export function BlogPostEditor({
  siteId,
  post,
  canManage,
}: {
  siteId: string;
  post: WebsiteBlogPost;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(post);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  async function save(status?: WebsiteBlogPost["status"]) {
    if (!canManage) return;
    setPending(true);
    try {
      const response = await fetch(
        `/api/website/sites/${siteId}/blog/${post.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            slug: form.slug,
            excerpt: form.excerpt,
            content: form.content,
            authorName: form.authorName,
            coverMediaId: form.coverMediaId,
            seoTitle: form.seoTitle,
            seoDescription: form.seoDescription,
            status: status ?? form.status,
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        post?: WebsiteBlogPost;
      };
      if (!response.ok) throw new Error(data.error || "Unable to save post.");
      if (data.post) setForm(data.post);
      setToast({
        message:
          status === "published" ? "Post published ✓" : "Post saved ✓",
        tone: "success",
      });
      router.refresh();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Unable to save post.",
        tone: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Edit post
          </h1>
          <div className="mt-2">
            <StatusBadge status={form.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/website/${siteId}/blog`}
            className={`${authSecondaryButtonClassName} !w-auto px-3`}
          >
            Back
          </Link>
          {canManage ? (
            <>
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3`}
                onClick={() => void save("draft")}
                disabled={pending}
              >
                Save draft
              </button>
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-4`}
                onClick={() => void save("published")}
                disabled={pending}
              >
                {pending ? "Saving…" : "Publish"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
        <div>
          <label className={authLabelClassName}>Title</label>
          <input
            className={authInputClassName}
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Post address</label>
          <input
            className={authInputClassName}
            value={form.slug}
            onChange={(event) =>
              setForm((current) => ({ ...current, slug: event.target.value }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Short summary</label>
          <textarea
            className={`${authInputClassName} min-h-20`}
            value={form.excerpt ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                excerpt: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Content</label>
          <textarea
            className={`${authInputClassName} min-h-64`}
            value={form.content}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Author</label>
            <input
              className={authInputClassName}
              value={form.authorName ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  authorName: event.target.value || null,
                }))
              }
              disabled={!canManage || pending}
            />
          </div>
          <MediaPicker
            siteId={siteId}
            value={form.coverMediaId}
            onChange={(coverMediaId) =>
              setForm((current) => ({ ...current, coverMediaId }))
            }
            disabled={!canManage || pending}
            label="Cover image"
            hint="cover"
          />
        </div>
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
