"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type { AiPrompt, AiPromptKind } from "@/lib/ai/types";
import { AI_PROMPT_KINDS } from "@/lib/ai/types";

export function PromptsManager({
  prompts,
  canManage,
}: {
  prompts: AiPrompt[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AiPromptKind>("workspace");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        editingId ? `/api/ai/prompts/${editingId}` : "/api/ai/prompts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            kind,
            content,
            description: description || null,
            isDefault: kind !== "custom",
          }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save prompt.");
      setName("");
      setContent("");
      setDescription("");
      setEditingId(null);
      setKind("workspace");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save prompt.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/prompts/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete prompt.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete prompt.");
    } finally {
      setPending(false);
    }
  }

  function startEdit(prompt: AiPrompt) {
    setEditingId(prompt.id);
    setName(prompt.name);
    setKind(prompt.kind);
    setContent(prompt.content);
    setDescription(prompt.description || "");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Prompts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage system prompts, workspace-specific prompts, and reusable custom
          instructions.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      {canManage ? (
        <form
          onSubmit={save}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={authLabelClassName}>Name</label>
              <input
                className={authInputClassName}
                value={name}
                required
                disabled={pending}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <label className={authLabelClassName}>Kind</label>
              <select
                className={authInputClassName}
                value={kind}
                disabled={pending}
                onChange={(event) =>
                  setKind(event.target.value as AiPromptKind)
                }
              >
                {AI_PROMPT_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={authLabelClassName}>Description</label>
            <input
              className={authInputClassName}
              value={description}
              disabled={pending}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Content</label>
            <textarea
              className={`${authInputClassName} min-h-36`}
              value={content}
              required
              disabled={pending}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={`${authButtonClassName} !w-auto px-4`}
              disabled={pending}
            >
              {editingId ? "Update prompt" : "Create prompt"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
                onClick={() => {
                  setEditingId(null);
                  setName("");
                  setContent("");
                  setDescription("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {prompts.map((prompt) => (
          <article
            key={prompt.id}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  {prompt.name}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {prompt.kind}
                  {prompt.isDefault ? " · default" : ""}
                  {prompt.isActive ? "" : " · inactive"} · {prompt.slug}
                </p>
              </div>
              {canManage ? (
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    className="text-zinc-700 hover:underline"
                    onClick={() => startEdit(prompt)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => remove(prompt.id)}
                    disabled={pending}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
            {prompt.description ? (
              <p className="mt-2 text-sm text-zinc-600">{prompt.description}</p>
            ) : null}
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
              {prompt.content}
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}
