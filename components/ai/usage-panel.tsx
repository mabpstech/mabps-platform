import type { AiUsageSummary } from "@/lib/ai/types";

export function UsagePanel({ usage }: { usage: AiUsageSummary }) {
  const cards = [
    { label: "Requests", value: usage.requests },
    { label: "Success", value: usage.successCount },
    { label: "Failures", value: usage.failureCount },
    { label: "Total tokens", value: usage.totalTokens },
    { label: "Credits (logs)", value: usage.credits },
    {
      label: "Billing credits",
      value:
        usage.billingLimit < 0
          ? `${usage.billingCredits} / ∞`
          : `${usage.billingCredits} / ${usage.billingLimit}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">AI usage</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Period {usage.periodKey}. Usage is billed through workspace AI credits
          and mirrored into Analytics.
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
            <p className="mt-1 text-xl font-semibold text-zinc-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">By provider</h2>
          <div className="mt-3 space-y-2 text-sm">
            {usage.byProvider.length === 0 ? (
              <p className="text-zinc-500">No usage yet.</p>
            ) : (
              usage.byProvider.map((row) => (
                <div
                  key={row.provider}
                  className="flex items-center justify-between border-b border-zinc-100 py-2"
                >
                  <span>{row.provider}</span>
                  <span className="text-zinc-500">
                    {row.requests} req · {row.tokens} tok · {row.credits} cr
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">By model</h2>
          <div className="mt-3 space-y-2 text-sm">
            {usage.byModel.length === 0 ? (
              <p className="text-zinc-500">No usage yet.</p>
            ) : (
              usage.byModel.map((row) => (
                <div
                  key={row.model}
                  className="flex items-center justify-between border-b border-zinc-100 py-2"
                >
                  <span className="font-mono text-xs">{row.model}</span>
                  <span className="text-zinc-500">
                    {row.requests} req · {row.tokens} tok
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
