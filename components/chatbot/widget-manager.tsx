"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type {
  ChatbotBot,
  ChatbotWidget,
  WidgetPosition,
} from "@/lib/chatbot/types";

export function WidgetManager({
  bots,
  initialBotId,
  initialWidget,
}: {
  bots: ChatbotBot[];
  initialBotId?: string;
  initialWidget: ChatbotWidget | null;
}) {
  const router = useRouter();
  const [botId, setBotId] = useState(initialBotId || bots[0]?.id || "");
  const selectedBot = bots.find((bot) => bot.id === botId) || null;
  const [title, setTitle] = useState(initialWidget?.title || "Chat with us");
  const [primaryColor, setPrimaryColor] = useState(
    initialWidget?.primaryColor || "#18181b",
  );
  const [position, setPosition] = useState<WidgetPosition>(
    initialWidget?.position || "bottom-right",
  );
  const [launcherLabel, setLauncherLabel] = useState(
    initialWidget?.launcherLabel || "Chat",
  );
  const [isEnabled, setIsEnabled] = useState(initialWidget?.isEnabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const embedSnippet = useMemo(() => {
    if (!selectedBot) return "";
    return `<script src="/api/chatbot/public/${selectedBot.publicKey}/embed.js" async></script>`;
  }, [selectedBot]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!botId) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/chatbot/bots/${botId}/widget`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          primaryColor,
          position,
          launcherLabel,
          isEnabled,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save widget.");
      setSuccess("Widget settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save widget.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Website widget</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Embed a chat bubble on any site. Public APIs power the widget without
          exposing workspace credentials.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Bot</label>
          <select
            className={authInputClassName}
            value={botId}
            onChange={(e) => {
              setBotId(e.target.value);
              router.push(`/chatbot/widget?botId=${e.target.value}`);
            }}
            disabled={pending || !bots.length}
          >
            {bots.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name}
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
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Launcher label</label>
          <input
            className={authInputClassName}
            value={launcherLabel}
            onChange={(e) => setLauncherLabel(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Primary color</label>
          <input
            className={authInputClassName}
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Position</label>
          <select
            className={authInputClassName}
            value={position}
            onChange={(e) => setPosition(e.target.value as WidgetPosition)}
            disabled={pending}
          >
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            disabled={pending}
          />
          Widget enabled
        </label>
        <div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending || !botId}
          >
            Save widget
          </button>
        </div>
      </form>

      {selectedBot ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-medium text-zinc-900">Embed snippet</h2>
          <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
            {embedSnippet}
          </pre>
          <p className="text-sm text-zinc-500">
            Preview:{" "}
            <a
              className="underline"
              href={`/embed/chatbot/${selectedBot.publicKey}`}
              target="_blank"
              rel="noreferrer"
            >
              /embed/chatbot/{selectedBot.publicKey.slice(0, 12)}…
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
