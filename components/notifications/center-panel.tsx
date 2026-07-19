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
  AppNotification,
  NotificationChannel,
  NotificationPriority,
  NotificationTemplate,
} from "@/lib/notifications/types";

const CHANNELS: NotificationChannel[] = [
  "in_app",
  "push",
  "email",
  "whatsapp",
  "browser",
];

const PRIORITIES: NotificationPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
];

export function NotificationsCenterPanel({
  notifications,
  templates,
  unreadCount,
}: {
  notifications: AppNotification[];
  templates: NotificationTemplate[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<NotificationPriority>("normal");
  const [templateId, setTemplateId] = useState("");
  const [channels, setChannels] = useState<NotificationChannel[]>(["in_app"]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  function toggleChannel(channel: NotificationChannel) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  async function sendNotification(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          priority,
          channels,
          templateId: templateId || null,
          email: email || null,
          phone: phone || null,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        notification?: AppNotification;
      };
      if (!response.ok) throw new Error(data.error || "Unable to send.");
      setSuccess(
        data.notification?.status === "failed"
          ? `Send failed: ${data.notification.errorMessage || "unknown error"}`
          : "Notification sent.",
      );
      setTitle("");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send.");
    } finally {
      setPending(false);
    }
  }

  async function markRead(notificationId: string) {
    setError(null);
    try {
      const response = await fetch("/api/notifications/center", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to mark read.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark read.");
    }
  }

  async function markAllRead() {
    setError(null);
    try {
      const response = await fetch("/api/notifications/center", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to mark all.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark all.");
    }
  }

  async function enableBrowserNotifications() {
    setError(null);
    setSuccess(null);
    try {
      if (!("Notification" in window)) {
        throw new Error("Browser notifications are not supported.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Browser notification permission denied.");
      }
      const response = await fetch("/api/notifications/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "browser",
          endpoint: `browser://${crypto.randomUUID()}`,
          userAgent: navigator.userAgent,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to register subscription.");
      }
      setSuccess("Browser notifications enabled for this device.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to enable browser notifications.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Notification center
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {unreadCount} unread · send across channels and manage read state.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={enableBrowserNotifications}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Enable browser
          </button>
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Mark all read
          </button>
        </div>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={sendNotification}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
      >
        <div>
          <label className={authLabelClassName}>Title</label>
          <input
            className={authInputClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required={!templateId}
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
            required={!templateId}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Template</label>
          <select
            className={authInputClassName}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={pending}
          >
            <option value="">None</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Email (optional)</label>
          <input
            className={authInputClassName}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>WhatsApp phone (optional)</label>
          <input
            className={authInputClassName}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
            {pending ? "Sending…" : "Send notification"}
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <p className="text-sm text-zinc-500">No notifications yet.</p>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-4 py-3 ${
                item.isRead
                  ? "border-zinc-200 bg-white"
                  : "border-zinc-900/20 bg-zinc-50"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {item.title}
                    </p>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                      {item.priority}
                    </span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                      {item.category}
                    </span>
                    {!item.isRead ? (
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white">
                        unread
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{item.body}</p>
                  <p className="mt-2 text-xs text-zinc-400">
                    {item.channels.join(", ")} · {item.status} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                {!item.isRead ? (
                  <button
                    type="button"
                    onClick={() => markRead(item.id)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    Mark read
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
