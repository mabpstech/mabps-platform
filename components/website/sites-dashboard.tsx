"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authButtonClassName,
  authInputClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import {
  FirstRunPanel,
  OnboardingEncouragement,
} from "@/components/onboarding/first-run";
import { CreateSiteWizard } from "@/components/website/create-site-wizard";
import {
  EmptyState,
  StatusBadge,
} from "@/components/website/ui/empty-state";
import { formatRelativeTime } from "@/components/website/ui/labels";
import { Toast } from "@/components/website/ui/toast";
import type { WebsiteSite } from "@/lib/website/types";

export type SiteCardData = WebsiteSite & {
  logoMediaId?: string | null;
  logoText?: string | null;
  themeName?: string;
  primaryColor?: string;
};

type SortKey = "updated" | "name" | "status";

export function SitesDashboard({
  sites,
  canManage,
  sitesLimit,
  sitesUsed,
}: {
  sites: SiteCardData[];
  canManage: boolean;
  sitesLimit: number;
  sitesUsed: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "1") {
      setWizardOpen(true);
    }
  }, [canManage]);

  const hasUnpublished = sites.some((site) => site.status !== "published");
  const hasPublished = sites.some((site) => site.status === "published");

  const limitLabel =
    sitesLimit < 0 ? "Unlimited" : `${sitesUsed} of ${sitesLimit}`;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sites.filter((site) => {
      if (!q) return true;
      return (
        site.name.toLowerCase().includes(q) ||
        site.slug.toLowerCase().includes(q) ||
        (site.customDomain ?? "").toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "status") return a.status.localeCompare(b.status);
      return (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }, [sites, query, sort]);

  async function removeSite(siteId: string) {
    if (!canManage) return;
    if (!window.confirm("Delete this website and all of its content?")) return;
    setDeletingId(siteId);
    try {
      const response = await fetch(`/api/website/sites/${siteId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete.");
      setToast({ message: "Website deleted.", tone: "success" });
      router.refresh();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Unable to delete.",
        tone: "error",
      });
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
    }
  }

  async function duplicateSite(site: SiteCardData) {
    if (!canManage) return;
    setDuplicatingId(site.id);
    try {
      const response = await fetch("/api/website/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${site.name} Copy`,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        site?: WebsiteSite;
      };
      if (!response.ok || !data.site) {
        throw new Error(data.error || "Unable to duplicate.");
      }
      setToast({ message: "Website duplicated.", tone: "success" });
      router.push(`/website/${data.site.id}`);
      router.refresh();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Unable to duplicate.",
        tone: "error",
      });
    } finally {
      setDuplicatingId(null);
      setMenuOpenId(null);
    }
  }

  async function publishSite(siteId: string) {
    if (!canManage) return;
    try {
      const response = await fetch(`/api/website/sites/${siteId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to publish.");
      setToast({ message: "Website is now live.", tone: "success" });
      router.refresh();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Unable to publish.",
        tone: "error",
      });
    } finally {
      setMenuOpenId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Websites
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500">
            Build and manage professional websites for your business.
            {canManage ? ` ${limitLabel} websites used.` : ""}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-5`}
            onClick={() => setWizardOpen(true)}
          >
            Create website
          </button>
        ) : null}
      </div>

      {sites.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <input
              className={authInputClassName}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or domain…"
              aria-label="Search websites"
            />
          </div>
          <select
            className={`${authInputClassName} !w-auto min-w-[10rem]`}
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort websites"
          >
            <option value="updated">Last updated</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
          </select>
        </div>
      ) : null}

      {sites.length === 0 ? (
        <FirstRunPanel
          currentStep="website"
          headingLevel={2}
          encouragement="You are one step away from publishing your first website."
          onCreateWebsite={
            canManage ? () => setWizardOpen(true) : undefined
          }
          onSkip={() => router.push("/dashboard")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try a different search term or clear filters."
          action={
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-4`}
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          }
        />
      ) : (
        <>
          {hasUnpublished && !hasPublished ? (
            <OnboardingEncouragement message="You are one step away from publishing your first website." />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((site) => (
            <article
              key={site.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="h-2 w-full"
                style={{ background: site.primaryColor || "#18181b" }}
              />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                  <SiteLogo site={site} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/website/${site.id}`}
                        className="truncate text-base font-semibold text-zinc-900 hover:underline"
                      >
                        {site.name}
                      </Link>
                      <StatusBadge status={site.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {site.customDomain || `/p/${site.slug}`}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500">
                  <div>
                    <dt className="uppercase tracking-wide text-zinc-400">
                      Theme
                    </dt>
                    <dd className="mt-0.5 font-medium text-zinc-700">
                      {site.themeName || "Custom"}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-zinc-400">
                      Updated
                    </dt>
                    <dd className="mt-0.5 font-medium text-zinc-700">
                      {formatRelativeTime(site.updatedAt)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="uppercase tracking-wide text-zinc-400">
                      Publish
                    </dt>
                    <dd className="mt-0.5 font-medium text-zinc-700">
                      {site.status === "published"
                        ? "Published and visible"
                        : "Not published yet"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                  <Link
                    href={`/website/${site.id}/pages`}
                    className={`${authButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/p/${site.slug}`}
                    target="_blank"
                    className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                  >
                    Preview
                  </Link>
                  {canManage && site.status !== "published" ? (
                    <button
                      type="button"
                      className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                      onClick={() => void publishSite(site.id)}
                    >
                      Publish
                    </button>
                  ) : (
                    <Link
                      href={`/website/${site.id}/publish`}
                      className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                    >
                      Publish
                    </Link>
                  )}
                  <div className="relative ml-auto">
                    <button
                      type="button"
                      className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                      onClick={() =>
                        setMenuOpenId((current) =>
                          current === site.id ? null : site.id,
                        )
                      }
                      aria-expanded={menuOpenId === site.id}
                    >
                      More
                    </button>
                    {menuOpenId === site.id ? (
                      <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                        <MenuLink href={`/analytics/website`}>Analytics</MenuLink>
                        <MenuButton
                          onClick={() => void duplicateSite(site)}
                          disabled={duplicatingId === site.id}
                        >
                          {duplicatingId === site.id
                            ? "Duplicating…"
                            : "Duplicate"}
                        </MenuButton>
                        <MenuLink href={`/website/${site.id}`}>
                          Settings
                        </MenuLink>
                        {canManage ? (
                          <MenuButton
                            onClick={() => void removeSite(site.id)}
                            danger
                            disabled={deletingId === site.id}
                          >
                            {deletingId === site.id ? "Deleting…" : "Delete"}
                          </MenuButton>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
          </div>
        </>
      )}

      <CreateSiteWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        canManage={canManage}
      />

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}

function SiteLogo({ site }: { site: SiteCardData }) {
  if (site.logoMediaId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/website/media/file/${site.logoMediaId}`}
        alt=""
        className="h-12 w-12 rounded-xl border border-zinc-200 object-cover"
      />
    );
  }
  const initial = (site.logoText || site.name || "?").slice(0, 1).toUpperCase();
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-semibold text-white"
      style={{ background: site.primaryColor || "#18181b" }}
    >
      {initial}
    </div>
  );
}

function MenuLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
    >
      {children}
    </Link>
  );
}

function MenuButton({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-50 ${
        danger ? "text-red-700" : "text-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}
