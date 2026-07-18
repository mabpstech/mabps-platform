"use client";

import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type { MemorySearchResult } from "@/lib/memory/types";

export function MemorySearchPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MemorySearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/memory/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 10 }),
      });
      const data = (await response.json()) as {
        error?: string;
        result?: MemorySearchResult;
      };
      if (!response.ok || !data.result) {
        throw new Error(data.error || "Search failed.");
      }
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Semantic memory search
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Retrieve scored memories using embeddings, importance, and recency.
        </p>
      </div>

      <form
        onSubmit={runSearch}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <div>
          <label className={authLabelClassName}>Query</label>
          <input
            className={authInputClassName}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What does this visitor prefer?"
            disabled={pending}
          />
        </div>
        <button
          type="submit"
          className={authButtonClassName}
          disabled={pending || !query.trim()}
        >
          Search
        </button>
      </form>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      {result ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            {result.hits.length} hit(s) · provider {result.provider}/
            {result.model}
          </p>
          {result.hits.map((hit) => (
            <div
              key={hit.memory.id}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>{hit.memory.kind}</span>
                {hit.memory.key ? <span>key: {hit.memory.key}</span> : null}
                <span>score {hit.score.toFixed(3)}</span>
                <span>semantic {hit.semanticScore.toFixed(3)}</span>
                <span>importance {hit.importance.toFixed(2)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900">
                {hit.memory.content}
              </p>
            </div>
          ))}
          {!result.hits.length ? (
            <p className="text-sm text-zinc-500">No matching memories.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
