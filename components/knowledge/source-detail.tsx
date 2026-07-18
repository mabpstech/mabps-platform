"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { SOURCE_TYPE_LABELS } from "@/lib/knowledge/defaults";
import type {
  KbChunk,
  KbSource,
  KbSourceVersion,
} from "@/lib/knowledge/types";

export function SourceDetail({
  source,
  versions,
  chunks,
  canManage,
}: {
  source: KbSource;
  versions: KbSourceVersion[];
  chunks: KbChunk[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function reindex() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/knowledge/sources/${source.id}/reindex`,
        { method: "POST" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to re-index.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to re-index.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!canManage) return;
    if (!window.confirm("Delete this knowledge source?")) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/knowledge/sources/${source.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete.");
      router.push("/knowledge/sources");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/knowledge/sources"
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Sources
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            {source.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {SOURCE_TYPE_LABELS[source.type] || source.type} · {source.status} ·
            v{source.currentVersion}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={authButtonClassName}
            disabled={pending}
            onClick={reindex}
          >
            Re-index
          </button>
          {canManage ? (
            <button
              type="button"
              className={authSecondaryButtonClassName}
              disabled={pending}
              onClick={remove}
            >
              Delete source
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 sm:grid-cols-2">
        <p>
          <span className="font-medium text-zinc-900">Chunks:</span>{" "}
          {source.chunkCount}
        </p>
        <p>
          <span className="font-medium text-zinc-900">Last indexed:</span>{" "}
          {source.lastIndexedAt || "—"}
        </p>
        {source.sourceUrl ? (
          <p className="sm:col-span-2">
            <span className="font-medium text-zinc-900">URL:</span>{" "}
            <a
              href={source.sourceUrl}
              className="text-zinc-900 underline"
              target="_blank"
              rel="noreferrer"
            >
              {source.sourceUrl}
            </a>
          </p>
        ) : null}
        {source.fileName ? (
          <p>
            <span className="font-medium text-zinc-900">File:</span>{" "}
            {source.fileName}
          </p>
        ) : null}
        {source.errorMessage ? (
          <p className="sm:col-span-2 text-red-600">{source.errorMessage}</p>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900">Versions</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Chunks</th>
                <th className="px-4 py-3 font-medium">Indexed</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 text-zinc-900">v{version.version}</td>
                  <td className="px-4 py-3 text-zinc-600">{version.status}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {version.chunkCount}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {version.indexedAt || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900">
          Active chunks ({chunks.length})
        </h2>
        <div className="space-y-3">
          {chunks.slice(0, 20).map((chunk) => (
            <div
              key={chunk.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Chunk {chunk.chunkIndex + 1} · ~{chunk.tokenEstimate} tokens
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {chunk.content.slice(0, 800)}
                {chunk.content.length > 800 ? "…" : ""}
              </p>
            </div>
          ))}
          {!chunks.length ? (
            <p className="text-sm text-zinc-500">No active chunks.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
