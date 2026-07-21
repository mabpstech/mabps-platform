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
import { EmptyState, StatusBadge } from "@/components/website/ui/empty-state";
import type { WebsitePage } from "@/lib/website/types";

const PAGE_TYPE_LABELS: Record<string, string> = {
  home: "Home",
  about: "About",
  contact: "Contact",
  products: "Products",
  collections: "Collections",
  blog: "Blog",
  custom: "Custom",
};

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
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    () => pages[0]?.id ?? null,
  );

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
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Pages
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edit each page of your website. Start with Home for the best first impression.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      {canManage ? (
        <form
          onSubmit={createPage}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <div className="min-w-[16rem] flex-1">
            <label className={authLabelClassName}>New page name</label>
            <input
              className={authInputClassName}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={pending}
              placeholder="Services"
            />
          </div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            {pending ? "Creating…" : "Add page"}
          </button>
        </form>
      ) : null}

      {pages.length === 0 ? (
        <EmptyState
          title="No pages yet"
          description="Add your first page to start building your website."
        />
      ) : (
        <div className="grid gap-2.5">
          {pages.map((page) => {
            const selected = selectedPageId === page.id;
            return (
              <div
                key={page.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPageId(page.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedPageId(page.id);
                  }
                }}
                className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-zinc-200 border-l-4 py-4 pl-4 pr-5 transition ${
                  selected
                    ? "border-l-zinc-900 bg-zinc-50 shadow-sm"
                    : "border-l-transparent bg-white hover:bg-zinc-50/70"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/website/${siteId}/pages/${page.id}`}
                      className={`truncate text-zinc-900 hover:underline ${
                        selected ? "font-bold" : "font-semibold"
                      }`}
                      onClick={() => setSelectedPageId(page.id)}
                    >
                      {page.title}
                    </Link>
                    <StatusBadge status={page.status} />
                  </div>
                  <p className="text-sm leading-5 text-zinc-500">
                    {page.slug === "home" ? "Homepage" : `/${page.slug}`}
                    {" · "}
                    {PAGE_TYPE_LABELS[page.pageType] || page.pageType}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/website/${siteId}/pages/${page.id}`}
                    className={`${authButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                    onClick={() => setSelectedPageId(page.id)}
                  >
                    Edit
                  </Link>
                  {canManage && page.pageType !== "home" ? (
                    <button
                      type="button"
                      className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs text-red-700`}
                      onClick={(event) => {
                        event.stopPropagation();
                        void removePage(page.id);
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
