import Link from "next/link";
import type { KbOverviewStats } from "@/lib/knowledge/types";

export function KnowledgeOverview({ stats }: { stats: KbOverviewStats }) {
  const cards = [
    { label: "Sources", value: stats.sources },
    { label: "Ready", value: stats.readySources },
    { label: "Errors", value: stats.errorSources },
    { label: "Active chunks", value: stats.chunks },
    { label: "Versions", value: stats.versions },
    { label: "Websites", value: stats.websites },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Knowledge Base</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Multi-tenant document index with chunking, embeddings, and semantic
          search for Chatbot and Automation.
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

      <div className="flex flex-wrap gap-3">
        <Link
          href="/knowledge/sources"
          className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Manage sources
        </Link>
        <Link
          href="/knowledge/search"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Try semantic search
        </Link>
      </div>
    </div>
  );
}
