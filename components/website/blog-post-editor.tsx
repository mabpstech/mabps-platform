"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(status?: WebsiteBlogPost["status"]) {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setMessage(null);
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
      setMessage(status === "published" ? "Post published." : "Post saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save post.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit post</h1>
          <p className="mt-1 text-sm text-zinc-500">Status: {form.status}</p>
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
                onClick={() => save("draft")}
                disabled={pending}
              >
                Save draft
              </button>
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-4`}
                onClick={() => save("published")}
                disabled={pending}
              >
                {pending ? "Saving…" : "Publish"}
              </button>
            </>
          ) : null}
        </div>
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6">
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
          <label className={authLabelClassName}>Slug</label>
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
          <label className={authLabelClassName}>Excerpt</label>
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
            className={`${authInputClassName} min-h-64 font-mono text-sm`}
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
          <div>
            <label className={authLabelClassName}>Cover media ID</label>
            <input
              className={authInputClassName}
              value={form.coverMediaId ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  coverMediaId: event.target.value || null,
                }))
              }
              disabled={!canManage || pending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
