"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/components/crm/format";
import { authErrorClassName } from "@/lib/auth/styles";
import type { CrmDeal, CrmPipelineBoard } from "@/lib/crm/types";

export function PipelineBoard({ board }: { board: CrmPipelineBoard }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function moveDeal(deal: CrmDeal, stageId: string) {
    if (deal.stageId === stageId) return;
    setMovingId(deal.id);
    setError(null);
    try {
      const response = await fetch(`/api/crm/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to move deal.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to move deal.");
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {board.pipeline.name} — drag deals between stages with the stage
            selector on each card.
          </p>
        </div>
        <Link
          href="/crm/deals"
          className="text-sm text-zinc-600 underline-offset-2 hover:underline"
        >
          Manage deals
        </Link>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {board.stages.map((stage) => (
          <section
            key={stage.id}
            className="w-72 shrink-0 rounded-xl border border-zinc-200 bg-zinc-50"
          >
            <header className="border-b border-zinc-200 px-3 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h2 className="text-sm font-semibold text-zinc-900">
                  {stage.name}
                </h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {stage.deals.length} deals · {formatMoney(stage.totalCents)}
              </p>
            </header>
            <div className="space-y-2 p-3">
              {stage.deals.map((deal) => (
                <article
                  key={deal.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
                >
                  <Link
                    href={`/crm/deals/${deal.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {deal.title}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-600">
                    {formatMoney(deal.amountCents, deal.currency)}
                  </p>
                  <label className="mt-2 block text-xs text-zinc-500">
                    Move to
                    <select
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800"
                      value={deal.stageId}
                      disabled={movingId === deal.id}
                      onChange={(event) => moveDeal(deal, event.target.value)}
                    >
                      {board.stages.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
              {stage.deals.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-zinc-400">
                  No deals
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
