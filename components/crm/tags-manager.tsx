"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type { CrmTag } from "@/lib/crm/types";

export function TagsManager({
  tags,
  canManage,
}: {
  tags: CrmTag[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3f3f46");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create tag.");
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create tag.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Tags</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Label companies, contacts, leads, customers, and deals for filtering.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <form
        onSubmit={create}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <div className="min-w-[14rem] flex-1">
          <label className={authLabelClassName}>Name</label>
          <input
            className={authInputClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Color</label>
          <input
            className="h-10 w-16 rounded-md border border-zinc-300 bg-white"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={pending}
          />
        </div>
        <button
          type="submit"
          className={`${authButtonClassName} !w-auto px-4`}
          disabled={pending}
        >
          {pending ? "Creating…" : "Create tag"}
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="inline-flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
          >
            <span
              className="inline-flex rounded-md px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
            {canManage ? (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={async () => {
                  if (!window.confirm("Delete this tag?")) return;
                  await fetch(`/api/crm/tags/${tag.id}`, { method: "DELETE" });
                  router.refresh();
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        ))}
        {tags.length === 0 ? (
          <p className="text-sm text-zinc-500">No tags yet.</p>
        ) : null}
      </div>
    </div>
  );
}
