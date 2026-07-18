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
import { SOURCE_TYPE_LABELS } from "@/lib/knowledge/defaults";
import type { KbSource } from "@/lib/knowledge/types";

export function SourcesManager({
  sources,
  canManage,
}: {
  sources: KbSource[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [maxPages, setMaxPages] = useState("8");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function uploadFile(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title || file.name);
      form.set("file", file);
      const response = await fetch("/api/knowledge/sources", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to upload file.");
      setTitle("");
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload file.");
    } finally {
      setPending(false);
    }
  }

  async function addWebsite(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/knowledge/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sourceUrl,
          crawlConfig: {
            maxPages: Number(maxPages) || 8,
            maxDepth: 1,
            sameOriginOnly: true,
          },
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to crawl URL.");
      setTitle("");
      setSourceUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to crawl URL.");
    } finally {
      setPending(false);
    }
  }

  async function reindex(sourceId: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/knowledge/sources/${sourceId}/reindex`,
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

  async function remove(sourceId: string) {
    if (!canManage) return;
    if (!window.confirm("Delete this knowledge source and its index?")) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Sources</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload PDF, DOCX, TXT, Markdown, or crawl website URLs. Sources are
          chunked, embedded, and versioned automatically.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={uploadFile}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <h2 className="font-medium text-zinc-900">Upload file</h2>
          <div>
            <label className={authLabelClassName}>Title</label>
            <input
              className={authInputClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional title"
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>File</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              className={authInputClassName}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            className={authButtonClassName}
            disabled={pending || !file}
          >
            Upload & index
          </button>
        </form>

        <form
          onSubmit={addWebsite}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <h2 className="font-medium text-zinc-900">Crawl website</h2>
          <div>
            <label className={authLabelClassName}>Title</label>
            <input
              className={authInputClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional title"
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>URL</label>
            <input
              className={authInputClassName}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/docs"
              required
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Max pages</label>
            <input
              className={authInputClassName}
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            className={authButtonClassName}
            disabled={pending || !sourceUrl.trim()}
          >
            Crawl & index
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Chunks</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-b border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/knowledge/sources/${source.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {source.title}
                  </Link>
                  {source.errorMessage ? (
                    <p className="mt-1 text-xs text-red-600">
                      {source.errorMessage}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {SOURCE_TYPE_LABELS[source.type] || source.type}
                </td>
                <td className="px-4 py-3 text-zinc-600">{source.status}</td>
                <td className="px-4 py-3 text-zinc-600">
                  v{source.currentVersion || 0}
                </td>
                <td className="px-4 py-3 text-zinc-600">{source.chunkCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={authSecondaryButtonClassName}
                      disabled={pending}
                      onClick={() => reindex(source.id)}
                    >
                      Re-index
                    </button>
                    {canManage ? (
                      <button
                        type="button"
                        className={authSecondaryButtonClassName}
                        disabled={pending}
                        onClick={() => remove(source.id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!sources.length ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No knowledge sources yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
