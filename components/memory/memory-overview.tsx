"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { MemoryOverviewStats } from "@/lib/memory/types";

export function MemoryOverview({
  stats,
  canManage,
}: {
  stats: MemoryOverviewStats;
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const cards = [
    { label: "Active memories", value: stats.total },
    { label: "Short-term", value: stats.shortTerm },
    { label: "Long-term", value: stats.longTerm },
    { label: "Profile", value: stats.profile },
    { label: "Business", value: stats.business },
    { label: "Expired pending", value: stats.expired },
  ];

  async function runExpire() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/memory/expire", { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to expire memories.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to expire memories.");
    } finally {
      setPending(false);
    }
  }

  async function runAutoMerge() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/memory/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto: true, limit: 20 }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to merge memories.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to merge memories.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Memory Engine</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Multi-tenant short-term, long-term, profile, and business memory with
          scoring, expiration, merge, and semantic retrieval for Chatbot and
          Automation.
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

      <p className="text-sm text-zinc-500">
        Average importance:{" "}
        <span className="font-medium text-zinc-800">
          {stats.avgImportance.toFixed(2)}
        </span>
        {" · "}
        Merged archived: {stats.merged}
      </p>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/memory/entries"
          className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Browse memories
        </Link>
        <Link
          href="/memory/search"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Semantic search
        </Link>
        {canManage ? (
          <>
            <button
              type="button"
              className={authSecondaryButtonClassName}
              disabled={pending}
              onClick={runExpire}
            >
              Purge expired
            </button>
            <button
              type="button"
              className={authButtonClassName}
              disabled={pending}
              onClick={runAutoMerge}
            >
              Auto-merge similar
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
