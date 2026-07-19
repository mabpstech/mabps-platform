import Link from "next/link";
import type { AutomationOverview as Overview } from "@/lib/automation/types";

export function AutomationOverview({ stats }: { stats: Overview }) {
  const cards = [
    { label: "Workflows", value: stats.workflows },
    { label: "Active", value: stats.activeWorkflows },
    { label: "Runs", value: stats.runsTotal },
    { label: "Succeeded", value: stats.runsSucceeded },
    { label: "Failed", value: stats.runsFailed },
    { label: "In queue", value: stats.queuePending + stats.runsQueued },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Automation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Trigger → condition → action workflows across CRM, chatbot, website,
          email, and webhooks.
        </p>
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
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/automation/workflows"
          className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Open workflows
        </Link>
        <Link
          href="/automation/runs"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          View execution history
        </Link>
      </div>
    </div>
  );
}
