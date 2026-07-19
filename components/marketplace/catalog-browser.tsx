"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import { KIND_LABELS } from "@/lib/marketplace/defaults";
import type { ListingKind, MarketplaceListing } from "@/lib/marketplace/types";
import { LISTING_KINDS } from "@/lib/marketplace/types";

function formatPrice(listing: MarketplaceListing): string {
  if (listing.pricingModel === "free" || listing.priceCents === 0) {
    return "Free";
  }
  const amount = (listing.priceCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: listing.currency.toUpperCase(),
  });
  return listing.pricingModel === "subscription"
    ? `${amount}/mo`
    : amount;
}

export function CatalogBrowser({
  listings,
  initialKind,
}: {
  listings: MarketplaceListing[];
  initialKind?: string;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>(initialKind ?? "all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return listings.filter((listing) => {
      if (kind !== "all" && listing.kind !== kind) return false;
      if (!query) return true;
      return (
        listing.name.toLowerCase().includes(query) ||
        listing.summary.toLowerCase().includes(query) ||
        listing.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [listings, q, kind]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Catalog</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Plugins, themes, website templates, AI prompts, automation, CRM, and
          chatbot templates.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="min-w-[220px] flex-1">
          <label className={authLabelClassName}>Search</label>
          <input
            className={authInputClassName}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search name, tags…"
          />
        </div>
        <div className="min-w-[200px]">
          <label className={authLabelClassName}>Kind</label>
          <select
            className={authInputClassName}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="all">All kinds</option>
            {LISTING_KINDS.map((value) => (
              <option key={value} value={value}>
                {KIND_LABELS[value as ListingKind]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((listing) => (
          <Link
            key={listing.id}
            href={`/marketplace/catalog/${listing.id}`}
            className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {KIND_LABELS[listing.kind]}
                </p>
                <h2 className="mt-1 text-base font-semibold text-zinc-900">
                  {listing.name}
                </h2>
              </div>
              <p className="shrink-0 text-sm font-medium text-zinc-700">
                {formatPrice(listing)}
              </p>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{listing.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span>v{listing.latestVersion}</span>
              <span>·</span>
              <span>{listing.downloads} installs</span>
              <span>·</span>
              <span>
                {listing.ratingAverage.toFixed(1)} ({listing.ratingCount})
              </span>
              <span>·</span>
              <span>min plan: {listing.minPlanId}</span>
            </div>
          </Link>
        ))}
        {!filtered.length ? (
          <p className="text-sm text-zinc-500 md:col-span-2">
            No listings match your filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}
