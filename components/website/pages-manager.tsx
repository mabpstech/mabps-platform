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
import type { WebsitePage } from "@/lib/website/types";

export function PagesManager({
  siteId,
  pages,
  canManage,
}: {
  siteId: string;
  pages: WebsitePage[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createPage(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/website/sites/${siteId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await response.json()) as {
        error?: string;
        page?: WebsitePage;
      };
      if (!response.ok) throw new Error(data.error || "Unable to create page.");
      setTitle("");
      if (data.page) {
        router.push(`/website/${siteId}/pages/${data.page.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create page.");
    } finally {
      setPending(false);
    }
  }

  async function removePage(pageId: string) {
    if (!canManage) return;
    if (!window.confirm("Delete this page?")) return;
    const response = await fetch(
      `/api/website/sites/${siteId}/pages/${pageId}`,
      { method: "DELETE" },
    );
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Unable to delete page.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Pages</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Home, About, Contact, Products, Collections, Blog, and custom pages.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      {canManage ? (
        <form
          onSubmit={createPage}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <div className="min-w-[16rem] flex-1">
            <label className={authLabelClassName}>New page title</label>
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
            {pending ? "Creating…" : "Create page"}
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {pages.map((page) => (
          <div
            key={page.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div>
              <Link
                href={`/website/${siteId}/pages/${page.id}`}
                className="font-medium text-zinc-900 hover:underline"
              >
                {page.title}
              </Link>
              <p className="mt-1 text-sm text-zinc-500">
                /{page.slug === "home" ? "" : page.slug} · {page.pageType} ·{" "}
                {page.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/website/${siteId}/pages/${page.id}`}
                className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
              >
                Open builder
              </Link>
              {canManage && page.pageType !== "home" ? (
                <button
                  type="button"
                  className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-red-700`}
                  onClick={() => removePage(page.id)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
