import Link from "next/link";
import type { AiOverviewStats } from "@/lib/ai/types";

export function AiOverview({
  stats,
  canManage,
}: {
  stats: AiOverviewStats;
  canManage: boolean;
}) {
  const cards = [
    { label: "Conversations", value: stats.conversations },
    { label: "Messages", value: stats.messages },
    { label: "Active prompts", value: stats.prompts },
    { label: "Provider keys", value: stats.activeProviders },
    { label: "Logs today", value: stats.logsToday },
    { label: "Credits (period)", value: stats.creditsUsedPeriod },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">AI Assistant</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Workspace operator assistant with prompts, tools, streaming, and
            usage tracking across CRM, chatbot, knowledge, memory, automation,
            websites, analytics, and billing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/ai/chat"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
          >
            Open chat
          </Link>
          {canManage ? (
            <Link
              href="/ai/settings"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Settings
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Default model
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {stats.defaultProvider} / {stats.defaultModel || "default"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Success rate
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {stats.successRate}%
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Streaming
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {stats.streamingEnabled ? "Enabled" : "Disabled"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Tools</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {stats.toolsEnabled ? "Enabled" : "Disabled"}
          </p>
        </div>
      </div>
    </div>
  );
}
