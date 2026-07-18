"use client";

import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type { KbSearchResult } from "@/lib/knowledge/types";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<KbSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 8 }),
      });
      const data = (await response.json()) as {
        error?: string;
        result?: KbSearchResult;
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
        <h1 className="text-2xl font-semibold text-zinc-900">Semantic search</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Query the workspace knowledge index used by Chatbot and Automation.
        </p>
      </div>

      <form onSubmit={runSearch} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <label className={authLabelClassName}>Query</label>
          <input
            className={authInputClassName}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="How do refunds work?"
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
              key={hit.chunk.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900">
                  {hit.sourceTitle}
                </p>
                <p className="text-xs text-zinc-500">
                  score {hit.score.toFixed(3)} · v{hit.version}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {hit.chunk.content}
              </p>
            </div>
          ))}
          {!result.hits.length ? (
            <p className="text-sm text-zinc-500">No matching chunks.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
