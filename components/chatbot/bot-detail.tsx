"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type {
  AiProviderId,
  BotStatus,
  ChatbotBot,
  ChatbotChannel,
  ChatbotWidget,
} from "@/lib/chatbot/types";
import { AI_PROVIDERS, BOT_STATUSES } from "@/lib/chatbot/types";

export function BotDetail({
  bot,
  widget,
  channels,
  canManage,
}: {
  bot: ChatbotBot;
  widget: ChatbotWidget | null;
  channels: ChatbotChannel[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: bot.name,
    description: bot.description || "",
    systemPrompt: bot.systemPrompt,
    welcomeMessage: bot.welcomeMessage,
    fallbackMessage: bot.fallbackMessage,
    provider: bot.provider,
    model: bot.model || "",
    temperature: String(bot.temperature),
    status: bot.status,
    leadCaptureEnabled: bot.leadCaptureEnabled,
    handoffEnabled: bot.handoffEnabled,
    memoryEnabled: bot.memoryEnabled,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/chatbot/bots/${bot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          temperature: Number(form.temperature),
          model: form.model || null,
          description: form.description || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save bot.");
      setSuccess("Bot saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save bot.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!canManage) return;
    if (!window.confirm("Delete this bot and its knowledge sources?")) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/chatbot/bots/${bot.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete bot.");
      router.push("/chatbot/bots");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete bot.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{bot.name}</h1>
        <p className="mt-1 font-mono text-xs text-zinc-500">{bot.publicKey}</p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form onSubmit={save} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Name</label>
            <input
              className={authInputClassName}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Status</label>
            <select
              className={authInputClassName}
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as BotStatus })
              }
              disabled={pending}
            >
              {BOT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName}>Provider</label>
            <select
              className={authInputClassName}
              value={form.provider}
              onChange={(e) =>
                setForm({
                  ...form,
                  provider: e.target.value as AiProviderId,
                })
              }
              disabled={pending}
            >
              {AI_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName}>Model</label>
            <input
              className={authInputClassName}
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              disabled={pending}
            />
          </div>
        </div>

        <div>
          <label className={authLabelClassName}>Description</label>
          <input
            className={authInputClassName}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>System prompt</label>
          <textarea
            className={`${authInputClassName} min-h-32`}
            value={form.systemPrompt}
            onChange={(e) =>
              setForm({ ...form, systemPrompt: e.target.value })
            }
            disabled={pending}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Welcome message</label>
            <textarea
              className={`${authInputClassName} min-h-20`}
              value={form.welcomeMessage}
              onChange={(e) =>
                setForm({ ...form, welcomeMessage: e.target.value })
              }
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Fallback message</label>
            <textarea
              className={`${authInputClassName} min-h-20`}
              value={form.fallbackMessage}
              onChange={(e) =>
                setForm({ ...form, fallbackMessage: e.target.value })
              }
              disabled={pending}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
          {(
            [
              ["leadCaptureEnabled", "Save leads to CRM"],
              ["handoffEnabled", "Human handoff"],
              ["memoryEnabled", "Conversation memory"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) =>
                  setForm({ ...form, [key]: e.target.checked })
                }
                disabled={pending}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save bot"}
          </button>
          {canManage ? (
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-4`}
              onClick={remove}
              disabled={pending}
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium text-zinc-900">Channels</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600">
          {channels.map((channel) => (
            <li key={channel.id}>
              <span className="font-medium text-zinc-900">{channel.channel}</span>
              {" — "}
              {channel.status}
              {channel.channel === "whatsapp"
                ? " (provider interface ready; Cloud API not wired)"
                : ""}
            </li>
          ))}
        </ul>
        {widget ? (
          <p className="mt-4 text-sm text-zinc-500">
            Widget title: {widget.title}. Configure embed on the Widget page.
          </p>
        ) : null}
      </div>
    </div>
  );
}
