import Link from "next/link";
import { KIND_LABELS } from "@/lib/marketplace/defaults";
import type {
  ListingKind,
  MarketplaceOverview as Overview,
} from "@/lib/marketplace/types";
import { LISTING_KINDS } from "@/lib/marketplace/types";

export function MarketplaceOverview({
  stats,
}: {
  stats: Overview;
}) {
  const cards = [
    { label: "Catalog", value: stats.publishedListings },
    { label: "Installed", value: stats.installs },
    { label: "Enabled", value: stats.enabledInstalls },
    { label: "Updates", value: stats.updatesAvailable },
    { label: "Sandbox runs", value: stats.sandboxRuns },
    { label: "Purchases", value: stats.purchases },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Marketplace</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Discover plugins, themes, website templates, AI prompts, automation,
          CRM, and chatbot templates. Install per workspace with permissions,
          versioning, and sandboxed execution.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Browse by kind</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LISTING_KINDS.map((kind: ListingKind) => (
            <Link
              key={kind}
              href={`/marketplace/catalog?kind=${kind}`}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <p className="font-medium text-zinc-900">{KIND_LABELS[kind]}</p>
              <p className="mt-1 text-zinc-500">
                {stats.byKind[kind]} published
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/marketplace/catalog"
          className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Open catalog
        </Link>
        <Link
          href="/marketplace/installs"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Manage installs
        </Link>
        <Link
          href="/marketplace/developer"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Developer SDK
        </Link>
      </div>
    </div>
  );
}
