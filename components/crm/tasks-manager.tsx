"use client";

import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { formatDate } from "@/components/crm/format";
import { SearchFilters } from "@/components/crm/search-filters";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { CrmTask } from "@/lib/crm/types";

export function TasksManager({
  tasks,
  canManage,
}: {
  tasks: CrmTask[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("medium");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create task.");
      setTitle("");
      setDueAt("");
      setPriority("medium");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create task.");
    } finally {
      setPending(false);
    }
  }

  async function toggleDone(task: CrmTask) {
    const nextStatus = task.status === "done" ? "open" : "done";
    await fetch(`/api/crm/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Follow-ups and to-dos across the CRM workspace.
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchFilters
          statuses={[
            { value: "open", label: "Open" },
            { value: "done", label: "Done" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          extraFilters={[
            {
              key: "priority",
              label: "Priority",
              options: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ],
            },
          ]}
        />
      </Suspense>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <form
        onSubmit={create}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4"
      >
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Title</label>
          <input
            className={authInputClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Due date</label>
          <input
            className={authInputClassName}
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className={authLabelClassName}>Priority</label>
            <select
              className={authInputClassName}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={pending}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            Add
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div>
              <p
                className={`font-medium ${
                  task.status === "done"
                    ? "text-zinc-400 line-through"
                    : "text-zinc-900"
                }`}
              >
                {task.title}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {task.priority} · due {formatDate(task.dueAt)} · {task.status}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                onClick={() => toggleDone(task)}
              >
                {task.status === "done" ? "Reopen" : "Complete"}
              </button>
              {canManage ? (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={async () => {
                    if (!window.confirm("Delete this task?")) return;
                    await fetch(`/api/crm/tasks/${task.id}`, {
                      method: "DELETE",
                    });
                    router.refresh();
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">No tasks yet.</p>
        ) : null}
      </div>
    </div>
  );
}
