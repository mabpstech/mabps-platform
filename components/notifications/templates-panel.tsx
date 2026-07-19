"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationTemplate,
} from "@/lib/notifications/types";

const CATEGORIES: NotificationCategory[] = [
  "system",
  "crm",
  "billing",
  "automation",
  "ai",
  "marketing",
  "custom",
];

const PRIORITIES: NotificationPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
];

const CHANNELS: NotificationChannel[] = [
  "in_app",
  "push",
  "email",
  "whatsapp",
  "browser",
];

export function NotificationsTemplatesPanel({
  templates,
  canManage,
}: {
  templates: NotificationTemplate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("system");
  const [priority, setPriority] = useState<NotificationPriority>("normal");
  const [channels, setChannels] = useState<NotificationChannel[]>(["in_app"]);

  function toggleChannel(channel: NotificationChannel) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  async function createTemplate(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/notifications/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title,
          body,
          category,
          priority,
          channels,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create.");
      setSuccess("Template created.");
      setName("");
      setTitle("");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create.");
    } finally {
      setPending(false);
    }
  }

  async function deleteTemplate(templateId: string) {
    if (!canManage) return;
    setError(null);
    try {
      const response = await fetch(
        `/api/notifications/templates/${templateId}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Templates</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Reusable notification copy with channel and priority defaults. Use{" "}
          {"{{variable}}"} placeholders.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {canManage ? (
        <form
          onSubmit={createTemplate}
          className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
        >
          <div>
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
            <label className={authLabelClassName}>Category</label>
            <select
              className={authInputClassName}
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as NotificationCategory)
              }
              disabled={pending}
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
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
            <label className={authLabelClassName}>Priority</label>
            <select
              className={authInputClassName}
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as NotificationPriority)
              }
              disabled={pending}
            >
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={authLabelClassName}>Body</label>
            <textarea
              className={authInputClassName}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <p className={authLabelClassName}>Channels</p>
            <div className="flex flex-wrap gap-3">
              {CHANNELS.map((channel) => (
                <label
                  key={channel}
                  className="flex items-center gap-2 text-sm text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={channels.includes(channel)}
                    onChange={() => toggleChannel(channel)}
                    disabled={pending}
                  />
                  {channel}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className={authButtonClassName}
              disabled={pending}
            >
              {pending ? "Saving…" : "Create template"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="space-y-2">
        {templates.length === 0 ? (
          <p className="text-sm text-zinc-500">No templates yet.</p>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {template.name}{" "}
                    <span className="font-normal text-zinc-400">
                      ({template.slug})
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {template.title} — {template.body}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    {template.category} · {template.priority} ·{" "}
                    {template.channels.join(", ")} · {template.status}
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => deleteTemplate(template.id)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
