"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { ChatbotBot, ChatbotKnowledgeSource } from "@/lib/chatbot/types";

export function KnowledgeManager({
  bots,
  sources,
  canManage,
  initialBotId,
}: {
  bots: ChatbotBot[];
  sources: ChatbotKnowledgeSource[];
  canManage: boolean;
  initialBotId?: string;
}) {
  const router = useRouter();
  const [botId, setBotId] = useState(initialBotId || bots[0]?.id || "");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function addWebsite(event: React.FormEvent) {
    event.preventDefault();
    if (!botId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/chatbot/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId, title, sourceUrl }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to add URL.");
      setTitle("");
      setSourceUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add URL.");
    } finally {
      setPending(false);
    }
  }

  async function uploadFile(event: React.FormEvent) {
    event.preventDefault();
    if (!botId || !file) return;
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("botId", botId);
      form.set("title", title || file.name);
      form.set("file", file);
      const response = await fetch("/api/chatbot/knowledge", {
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

  async function reprocess(sourceId: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chatbot/knowledge/${sourceId}/reprocess`,
        { method: "POST" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to reprocess.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reprocess.");
    } finally {
      setPending(false);
    }
  }

  async function remove(sourceId: string) {
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/chatbot/knowledge?id=${sourceId}`, {
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
        <h1 className="text-2xl font-semibold text-zinc-900">Knowledge base</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Index PDF, DOCX, TXT, and website URLs for grounded answers.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div>
        <label className={authLabelClassName}>Bot</label>
        <select
          className={`${authInputClassName} max-w-md`}
          value={botId}
          onChange={(e) => setBotId(e.target.value)}
          disabled={pending || !bots.length}
        >
          {bots.map((bot) => (
            <option key={bot.id} value={bot.id}>
              {bot.name}
            </option>
          ))}
        </select>
      </div>

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
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>PDF / DOCX / TXT</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,text/plain"
              className="block w-full text-sm text-zinc-600"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending || !file || !botId}
          >
            Upload & index
          </button>
        </form>

        <form
          onSubmit={addWebsite}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <h2 className="font-medium text-zinc-900">Website URL</h2>
          <div>
            <label className={authLabelClassName}>Title</label>
            <input
              className={authInputClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>URL</label>
            <input
              className={authInputClassName}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/faq"
              required
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending || !botId}
          >
            Fetch & index
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
              <th className="px-4 py-3 font-medium">Chunks</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-b border-zinc-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{source.title}</p>
                  {source.errorMessage ? (
                    <p className="mt-1 text-xs text-red-600">
                      {source.errorMessage}
                    </p>
                  ) : null}
                  {source.sourceUrl ? (
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      {source.sourceUrl}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-600">{source.type}</td>
                <td className="px-4 py-3 text-zinc-600">{source.status}</td>
                <td className="px-4 py-3 text-zinc-600">{source.chunkCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                      onClick={() => reprocess(source.id)}
                      disabled={pending}
                    >
                      Reprocess
                    </button>
                    {canManage ? (
                      <button
                        type="button"
                        className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                        onClick={() => remove(source.id)}
                        disabled={pending}
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
                <td className="px-4 py-8 text-zinc-500" colSpan={5}>
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
