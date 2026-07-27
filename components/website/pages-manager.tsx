"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { EmptyState, StatusBadge } from "@/components/website/ui/empty-state";
import { InlineBanner } from "@/components/website/ui/inline-banner";
import { formatRelativeTime } from "@/components/website/ui/labels";
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

type PageIconKind =
  | "home"
  | "landing"
  | "blog"
  | "shop"
  | "contact"
  | "generic";

function resolvePageIconKind(page: WebsitePage): PageIconKind {
  const slug = page.slug.toLowerCase();
  if (page.pageType === "home" || slug === "home") return "home";
  if (slug === "landing") return "landing";
  if (page.pageType === "blog" || slug === "blog") return "blog";
  if (
    page.pageType === "products" ||
    page.pageType === "collections" ||
    slug === "shop"
  ) {
    return "shop";
  }
  if (page.pageType === "contact" || slug === "contact") return "contact";
  return "generic";
}

function PageTypeIcon({ kind }: { kind: PageIconKind }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (kind) {
    case "home":
      return (
        <svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );
    case "landing":
      return (
        <svg {...props}>
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <path d="m5.6 5.6 2.1 2.1" />
          <path d="m16.3 16.3 2.1 2.1" />
          <path d="m16.3 5.6-2.1 2.1" />
          <path d="m5.6 18.4 2.1-2.1" />
          <circle cx="12" cy="12" r="3.25" />
        </svg>
      );
    case "blog":
      return (
        <svg {...props}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
          <path d="M9 9h1" />
        </svg>
      );
    case "shop":
      return (
        <svg {...props}>
          <path d="M6.5 8h11l-1 12H7.5L6.5 8Z" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
          <path d="M9 12h.01" />
          <path d="M15 12h.01" />
        </svg>
      );
    case "contact":
      return (
        <svg {...props}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h2.1c.5 0 .9.3 1.1.8l1 2.4c.2.4.1.9-.2 1.2L9.3 9c1.2 2.1 3 3.9 5.1 5.1l1.6-1.2c.3-.3.8-.4 1.2-.2l2.4 1c.5.2.8.6.8 1.1v2.1A2.5 2.5 0 0 1 18.5 20 14.5 14.5 0 0 1 4 5.5Z" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
      );
  }
}

function PagesEmptyIllustration() {
  return (
    <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
      <div
        className="absolute inset-0 rounded-[1.35rem] bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200/80 shadow-inner"
        aria-hidden
      />
      <div
        className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-zinc-900/5"
        aria-hidden
      />
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative text-zinc-700"
        aria-hidden
      >
        <path d="M8 4h7l3 3v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M15 4v3h3" />
        <path d="M9 12h6" />
        <path d="M9 15h4" />
        <path d="M17.5 2.5 18 3.5 19 4 18 4.5 17.5 5.5 17 4.5 16 4 17 3.5Z" />
      </svg>
    </div>
  );
}

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
  const titleInputRef = useRef<HTMLInputElement>(null);
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
      <div className="min-w-0 max-w-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Build
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          Pages
          <span className="ml-2 text-base font-medium tabular-nums text-zinc-400">
            {pages.length}
          </span>
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          Edit each page of your website. Start with Home for the best first
          impression.
        </p>
      </div>

      <InlineBanner message={error} tone="error" />

      {canManage ? (
        <form
          onSubmit={createPage}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <div className="min-w-[16rem] flex-1">
            <label className={authLabelClassName} htmlFor="new-page-name">
              New page name
            </label>
            <input
              id="new-page-name"
              ref={titleInputRef}
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
          description="Add your first page to start building your website. Home is the best place to begin."
          icon={<PagesEmptyIllustration />}
          action={
            canManage ? (
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-5`}
                onClick={() => titleInputRef.current?.focus()}
              >
                Add your first page
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-2.5">
          {pages.map((page) => {
            const selected = selectedPageId === page.id;
            const iconKind = resolvePageIconKind(page);
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
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      selected
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    <PageTypeIcon kind={iconKind} />
                  </div>
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
                    <p className="text-xs leading-5 text-zinc-400">
                      Updated {formatRelativeTime(page.updatedAt)}
                    </p>
                  </div>
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
