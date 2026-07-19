"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import { KIND_LABELS, PERMISSION_LABELS } from "@/lib/marketplace/defaults";
import type {
  MarketplaceInstall,
  MarketplaceListing,
  MarketplaceListingVersion,
} from "@/lib/marketplace/types";

export function ListingDetail({
  listing,
  versions,
  install,
}: {
  listing: MarketplaceListing;
  versions: MarketplaceListingVersion[];
  install: MarketplaceInstall | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function installListing() {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/marketplace/installs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          permissions: listing.permissions,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to install listing.");
      }
      setSuccess("Installed successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to install.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/marketplace/catalog"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Back to catalog
        </Link>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
          {KIND_LABELS[listing.kind]}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          {listing.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{listing.summary}</p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-700 whitespace-pre-wrap">
          {listing.description}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-400">Latest version</dt>
            <dd className="font-medium text-zinc-900">{listing.latestVersion}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Pricing</dt>
            <dd className="font-medium text-zinc-900">
              {listing.pricingModel === "free"
                ? "Free"
                : `${(listing.priceCents / 100).toFixed(2)} ${listing.currency.toUpperCase()} (${listing.pricingModel})`}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-400">Minimum plan</dt>
            <dd className="font-medium text-zinc-900">{listing.minPlanId}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Downloads</dt>
            <dd className="font-medium text-zinc-900">{listing.downloads}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Permissions</h2>
        <ul className="mt-3 space-y-1 text-sm text-zinc-600">
          {listing.permissions.map((permission) => (
            <li key={permission}>
              {PERMISSION_LABELS[permission] ?? permission}
            </li>
          ))}
          {!listing.permissions.length ? (
            <li>No special permissions required.</li>
          ) : null}
        </ul>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Versions</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-2 last:border-0"
            >
              <div>
                <p className="font-medium text-zinc-900">
                  v{version.version}
                  {version.isLatest ? (
                    <span className="ml-2 text-xs font-normal text-emerald-700">
                      latest
                    </span>
                  ) : null}
                </p>
                <p className="text-zinc-500">
                  {version.changelog || "No changelog."}
                </p>
              </div>
              <p className="shrink-0 text-xs text-zinc-400">
                {new Date(version.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        {install ? (
          <>
            <Link
              href="/marketplace/installs"
              className={`${authSecondaryButtonClassName} !w-auto px-4`}
            >
              Manage install (v{install.version}
              {install.enabled ? "" : ", disabled"})
            </Link>
          </>
        ) : (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
            onClick={installListing}
          >
            {pending ? "Installing…" : "Install"}
          </button>
        )}
      </div>
    </div>
  );
}
