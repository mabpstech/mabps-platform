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
import { KIND_LABELS } from "@/lib/memory/defaults";
import type { MemoryEntry, MemoryKind } from "@/lib/memory/types";

const KINDS: MemoryKind[] = [
  "short_term",
  "long_term",
  "profile",
  "business",
];

export function EntriesManager({
  memories,
  canManage,
}: {
  memories: MemoryEntry[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<MemoryKind>("long_term");
  const [key, setKey] = useState("");
  const [content, setContent] = useState("");
  const [importance, setImportance] = useState("0.65");
  const [scopeId, setScopeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  async function createMemory(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          content,
          key: key.trim() || null,
          importance: Number(importance) || undefined,
          scopeId: scopeId.trim() || null,
          upsertByKey: Boolean(key.trim()),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save memory.");
      setContent("");
      setKey("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save memory.");
    } finally {
      setPending(false);
    }
  }

  async function removeMemory(id: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/memory/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete memory.");
      setSelected((prev) => prev.filter((item) => item !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete memory.");
    } finally {
      setPending(false);
    }
  }

  async function mergeSelected() {
    if (selected.length < 2) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/memory/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryIds: selected }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to merge memories.");
      setSelected([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to merge memories.");
    } finally {
      setPending(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Memory entries</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create, score, merge, and manage workspace memories.
        </p>
      </div>

      <form
        onSubmit={createMemory}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Kind</label>
            <select
              className={authInputClassName}
              value={kind}
              onChange={(e) => setKind(e.target.value as MemoryKind)}
              disabled={pending}
            >
              {KINDS.map((value) => (
                <option key={value} value={value}>
                  {KIND_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName}>Importance (0–1)</label>
            <input
              className={authInputClassName}
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Key (optional)</label>
            <input
              className={authInputClassName}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="preferred_language"
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Scope id (optional)</label>
            <input
              className={authInputClassName}
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              placeholder="visitor or conversation id"
              disabled={pending}
            />
          </div>
        </div>
        <div>
          <label className={authLabelClassName}>Content</label>
          <textarea
            className={authInputClassName}
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Customer prefers email follow-up on Tuesdays."
            disabled={pending}
          />
        </div>
        <button
          type="submit"
          className={authButtonClassName}
          disabled={pending || !content.trim()}
        >
          Save memory
        </button>
      </form>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">{memories.length} memories</p>
        <button
          type="button"
          className={authSecondaryButtonClassName}
          disabled={pending || selected.length < 2}
          onClick={mergeSelected}
        >
          Merge selected ({selected.length})
        </button>
      </div>

      <div className="space-y-2">
        {memories.map((memory) => (
          <div
            key={memory.id}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selected.includes(memory.id)}
                      onChange={() => toggleSelected(memory.id)}
                    />
                    Select
                  </label>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700">
                    {KIND_LABELS[memory.kind]}
                  </span>
                  {memory.key ? <span>key: {memory.key}</span> : null}
                  <span>importance {memory.importance.toFixed(2)}</span>
                  <span>score {memory.score.toFixed(2)}</span>
                  {memory.expiresAt ? (
                    <span>expires {new Date(memory.expiresAt).toLocaleString()}</span>
                  ) : (
                    <span>no expiry</span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900">
                  {memory.content}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {memory.scopeType}
                  {memory.scopeId ? `:${memory.scopeId}` : ""} · {memory.source}
                </p>
              </div>
              {canManage ? (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:text-red-700"
                  disabled={pending}
                  onClick={() => removeMemory(memory.id)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {!memories.length ? (
          <p className="text-sm text-zinc-500">No memories yet.</p>
        ) : null}
      </div>
    </div>
  );
}
