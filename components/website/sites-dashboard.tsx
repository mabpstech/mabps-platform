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
import type { WebsiteSite } from "@/lib/website/types";

export function SitesDashboard({
  sites,
  canManage,
  sitesLimit,
  sitesUsed,
}: {
  sites: WebsiteSite[];
  canManage: boolean;
  sitesLimit: number;
  sitesUsed: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function createSite(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/website/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        site?: WebsiteSite;
      };
      if (!response.ok) {
        throw new Error(data.error || "Unable to create site.");
      }
      setName("");
      setSlug("");
      if (data.site) {
        router.push(`/sites/${data.site.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create site.");
    } finally {
      setPending(false);
    }
  }

  async function removeSite(siteId: string) {
    if (!canManage) return;
    if (!window.confirm("Delete this site and all of its content?")) return;
    setDeletingId(siteId);
    setError(null);
    try {
      const response = await fetch(`/api/website/sites/${siteId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to delete site.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete site.");
    } finally {
      setDeletingId(null);
    }
  }

  const limitLabel =
    sitesLimit < 0 ? "Unlimited" : `${sitesUsed} / ${sitesLimit}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Website Builder
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create multi-tenant sites with pages, media, blog, forms, and
            custom-domain publishing. Sites used: {limitLabel}.
          </p>
        </div>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      {canManage ? (
        <form
          onSubmit={createSite}
          className="rounded-xl border border-zinc-200 bg-white p-6"
        >
          <h2 className="text-lg font-medium text-zinc-900">Create a site</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={authLabelClassName} htmlFor="site-name">
                Name
              </label>
              <input
                id="site-name"
                className={authInputClassName}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Store"
                required
                disabled={pending}
              />
            </div>
            <div>
              <label className={authLabelClassName} htmlFor="site-slug">
                Slug (optional)
              </label>
              <input
                id="site-slug"
                className={authInputClassName}
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="acme-store"
                disabled={pending}
              />
            </div>
          </div>
          <div className="mt-4 max-w-xs">
            <button
              type="submit"
              className={authButtonClassName}
              disabled={pending || !name.trim()}
            >
              {pending ? "Creating…" : "Create site"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {sites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-500">
            No sites yet. Create your first site to open the page builder.
          </div>
        ) : (
          sites.map((site) => (
            <div
              key={site.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div>
                <Link
                  href={`/sites/${site.id}`}
                  className="text-base font-medium text-zinc-900 hover:underline"
                >
                  {site.name}
                </Link>
                <p className="mt-1 text-sm text-zinc-500">
                  /{site.slug} · {site.status}
                  {site.customDomain ? ` · ${site.customDomain}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/sites/${site.id}/pages`}
                  className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                >
                  Edit
                </Link>
                <Link
                  href={`/p/${site.slug}`}
                  target="_blank"
                  className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                >
                  Preview
                </Link>
                {canManage ? (
                  <button
                    type="button"
                    className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-red-700`}
                    onClick={() => removeSite(site.id)}
                    disabled={deletingId === site.id}
                  >
                    {deletingId === site.id ? "Deleting…" : "Delete"}
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
