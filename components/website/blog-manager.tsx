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
} from "@/lib/auth/styles";
import type { WebsiteBlogPost } from "@/lib/website/types";

export function BlogManager({
  siteId,
  posts,
  canManage,
}: {
  siteId: string;
  posts: WebsiteBlogPost[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createPost(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/website/sites/${siteId}/blog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await response.json()) as {
        error?: string;
        post?: WebsiteBlogPost;
      };
      if (!response.ok) throw new Error(data.error || "Unable to create post.");
      setTitle("");
      if (data.post) {
        router.push(`/website/${siteId}/blog/${data.post.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create post.");
    } finally {
      setPending(false);
    }
  }

  async function removePost(postId: string) {
    if (!canManage) return;
    if (!window.confirm("Delete this blog post?")) return;
    const response = await fetch(
      `/api/website/sites/${siteId}/blog/${postId}`,
      { method: "DELETE" },
    );
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Unable to delete post.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Blog</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Write and publish posts for the site blog page.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      {canManage ? (
        <form
          onSubmit={createPost}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <div className="min-w-[16rem] flex-1">
            <label className={authLabelClassName}>New post title</label>
            <input
              className={authInputClassName}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            {pending ? "Creating…" : "Create post"}
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-500">
            No posts yet.
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div>
                <Link
                  href={`/website/${siteId}/blog/${post.id}`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  {post.title}
                </Link>
                <p className="mt-1 text-sm text-zinc-500">
                  /{post.slug} · {post.status}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/website/${siteId}/blog/${post.id}`}
                  className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                >
                  Edit
                </Link>
                {canManage ? (
                  <button
                    type="button"
                    className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-red-700`}
                    onClick={() => removePost(post.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
