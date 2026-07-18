"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { formatMoney } from "@/components/crm/format";
import { SearchFilters } from "@/components/crm/search-filters";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type {
  CrmCustomer,
  CrmDeal,
  CrmPipelineStage,
  CrmTag,
} from "@/lib/crm/types";

export function DealsManager({
  deals,
  stages,
  customers,
  tags,
  canManage,
}: {
  deals: CrmDeal[];
  stages: CrmPipelineStage[];
  customers: CrmCustomer[];
  tags: CrmTag[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const stageMap = new Map(stages.map((s) => [s.id, s.name]));

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const amountCents = Math.round(Number(amount || 0) * 100);
      const response = await fetch("/api/crm/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          amountCents,
          customerId: customerId || null,
          stageId: stageId || undefined,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        deal?: CrmDeal;
      };
      if (!response.ok) throw new Error(data.error || "Unable to create deal.");
      setTitle("");
      setAmount("");
      setCustomerId("");
      if (data.deal) router.push(`/crm/deals/${data.deal.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create deal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Deals</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track opportunities and move them through the sales pipeline.
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchFilters
          statuses={[
            { value: "open", label: "Open" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
          ]}
          extraFilters={[
            {
              key: "stageId",
              label: "Stage",
              options: stages.map((stage) => ({
                value: stage.id,
                label: stage.name,
              })),
            },
            {
              key: "tagId",
              label: "Tag",
              options: tags.map((tag) => ({ value: tag.id, label: tag.name })),
            },
          ]}
        />
      </Suspense>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <form
        onSubmit={create}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-5"
      >
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
          <label className={authLabelClassName}>Amount (USD)</label>
          <input
            className={authInputClassName}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Customer</label>
          <select
            className={authInputClassName}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={pending}
          >
            <option value="">None</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Stage</label>
          <select
            className={authInputClassName}
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            disabled={pending}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className={authButtonClassName} disabled={pending}>
            {pending ? "Creating…" : "Create deal"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Deal</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage ? <th className="px-4 py-3 font-medium" /> : null}
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/crm/deals/${deal.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {deal.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatMoney(deal.amountCents, deal.currency)}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {stageMap.get(deal.stageId) || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">{deal.status}</td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={async () => {
                        if (!window.confirm("Delete this deal?")) return;
                        await fetch(`/api/crm/deals/${deal.id}`, {
                          method: "DELETE",
                        });
                        router.refresh();
                      }}
                    >
                      Delete
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {deals.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No deals yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
