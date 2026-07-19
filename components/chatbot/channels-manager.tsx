"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { ChatbotBot, ChatbotChannel } from "@/lib/chatbot/types";

type ChannelRow = ChatbotChannel & { providerImplemented?: boolean };

export function ChannelsManager({
  bots,
  channels,
  initialBotId,
}: {
  bots: ChatbotBot[];
  channels: ChannelRow[];
  initialBotId?: string;
}) {
  const router = useRouter();
  const [botId, setBotId] = useState(initialBotId || bots[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function connectWhatsApp() {
    if (!botId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/chatbot/bots/${botId}/channels`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "whatsapp",
          status: "connected",
          config: {
            note: "Credentials managed in WhatsApp Integration settings",
            workspaceId: null,
          },
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to update channel.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update channel.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Channels</h1>
        <p className="mt-1 text-sm text-zinc-500">
          API-first channel adapters. Widget, API, and WhatsApp Cloud API are
          available. Configure WhatsApp credentials under{" "}
          <Link href="/whatsapp/settings" className="underline">
            WhatsApp settings
          </Link>
          .
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div>
        <label className={authLabelClassName}>Bot</label>
        <select
          className={`${authInputClassName} max-w-md`}
          value={botId}
          onChange={(e) => {
            setBotId(e.target.value);
            router.push(`/chatbot/channels?botId=${e.target.value}`);
          }}
          disabled={!bots.length}
        >
          {bots.map((bot) => (
            <option key={bot.id} value={bot.id}>
              {bot.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Implemented</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel) => (
              <tr key={channel.id} className="border-b border-zinc-100">
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {channel.channel}
                </td>
                <td className="px-4 py-3 text-zinc-600">{channel.status}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {channel.providerImplemented === false ? "stub" : "yes"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {channel.channel === "whatsapp"
                    ? "WhatsApp Cloud API via Integrations module."
                    : channel.channel === "widget"
                      ? "Website embed + public session APIs."
                      : "Programmatic send/receive over Chatbot APIs."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className={`${authSecondaryButtonClassName} !w-auto px-4`}
        onClick={connectWhatsApp}
        disabled={pending || !botId}
      >
        Mark WhatsApp channel connected
      </button>
    </div>
  );
}
