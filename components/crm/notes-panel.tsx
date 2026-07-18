"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type { CrmEntityType, CrmNote } from "@/lib/crm/types";
import { formatDateTime } from "@/components/crm/format";

export function NotesPanel({
  entityType,
  entityId,
  notes,
}: {
  entityType: CrmEntityType;
  entityId: string;
  notes: CrmNote[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function addNote(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, body }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to add note.");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add note.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-medium text-zinc-900">Notes</h2>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      <form onSubmit={addNote} className="space-y-3">
        <div>
          <label className={authLabelClassName}>Add note</label>
          <textarea
            className={`${authInputClassName} min-h-24`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            disabled={pending}
          />
        </div>
        <button
          type="submit"
          className={`${authButtonClassName} !w-auto px-4`}
          disabled={pending || !body.trim()}
        >
          {pending ? "Saving…" : "Add note"}
        </button>
      </form>
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-zinc-500">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
            >
              <p className="whitespace-pre-wrap text-sm text-zinc-800">
                {note.body}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {formatDateTime(note.createdAt)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
