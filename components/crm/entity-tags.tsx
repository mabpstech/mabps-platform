"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authErrorClassName,
  authInputClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { CrmEntityType, CrmTag } from "@/lib/crm/types";

export function EntityTags({
  entityType,
  entityId,
  assigned,
  allTags,
}: {
  entityType: CrmEntityType;
  entityId: string;
  assigned: CrmTag[];
  allTags: CrmTag[];
}) {
  const router = useRouter();
  const [tagId, setTagId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const available = allTags.filter(
    (tag) => !assigned.some((item) => item.id === tag.id),
  );

  async function assign() {
    if (!tagId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/tags/${tagId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to assign tag.");
      setTagId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign tag.");
    } finally {
      setPending(false);
    }
  }

  async function unassign(id: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/tags/${id}/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to remove tag.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove tag.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-medium text-zinc-900">Tags</h2>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {assigned.length === 0 ? (
          <p className="text-sm text-zinc-500">No tags assigned.</p>
        ) : (
          assigned.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => unassign(tag.id)}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
              title="Remove tag"
            >
              {tag.name}
              <span aria-hidden>×</span>
            </button>
          ))
        )}
      </div>
      {available.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={`${authInputClassName} !w-auto`}
            value={tagId}
            onChange={(event) => setTagId(event.target.value)}
            disabled={pending}
          >
            <option value="">Add tag…</option>
            {available.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${authSecondaryButtonClassName} !w-auto px-3 py-2`}
            onClick={assign}
            disabled={pending || !tagId}
          >
            Assign
          </button>
        </div>
      ) : null}
    </section>
  );
}
