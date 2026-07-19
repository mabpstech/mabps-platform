"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { GuardianRepair } from "@/lib/guardian/types";

export function GuardianRepairsPanel({
  repairs,
  canManage,
}: {
  repairs: GuardianRepair[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function applyRepair(repairId: string) {
    if (!canManage) return;
    setPendingId(repairId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `/api/guardian/repairs/${repairId}/apply`,
        { method: "POST" },
      );
      const data = (await response.json()) as {
        error?: string;
        repair?: { resultSummary?: string | null };
      };
      if (!response.ok) throw new Error(data.error || "Repair failed.");
      setSuccess(data.repair?.resultSummary || "Repair applied.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Repair failed.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Repair recommendations
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Auto-generated fixes with one-click apply for safe remediations.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {repairs.length === 0 ? (
        <p className="text-sm text-zinc-500">No repair recommendations yet.</p>
      ) : (
        <div className="space-y-3">
          {repairs.map((repair) => (
            <article
              key={repair.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    {repair.action} · {repair.status} · risk {repair.riskLevel}
                    {repair.oneClick ? " · one-click" : " · manual"}
                  </p>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    {repair.title}
                  </h2>
                  <p className="text-sm text-zinc-600">{repair.description}</p>
                  {repair.steps.length ? (
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600">
                      {repair.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                  {repair.resultSummary ? (
                    <p className="text-sm text-emerald-700">
                      Result: {repair.resultSummary}
                    </p>
                  ) : null}
                  {repair.errorMessage ? (
                    <p className="text-sm text-red-700">{repair.errorMessage}</p>
                  ) : null}
                </div>
                {canManage &&
                repair.oneClick &&
                ["suggested", "approved", "failed"].includes(repair.status) ? (
                  <button
                    type="button"
                    className={`${authButtonClassName} sm:w-auto`}
                    disabled={pendingId === repair.id}
                    onClick={() => applyRepair(repair.id)}
                  >
                    {pendingId === repair.id ? "Applying…" : "One-click repair"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
