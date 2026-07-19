"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authErrorClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { GuardianFinding } from "@/lib/guardian/types";

export function GuardianFindingsPanel({
  findings,
  canManage,
}: {
  findings: GuardianFinding[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function setStatus(
    findingId: string,
    status: "acknowledged" | "ignored" | "resolved",
  ) {
    if (!canManage) return;
    setPendingId(findingId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/guardian/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Update failed.");
      setSuccess(`Finding marked ${status}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Findings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Detected issues from diagnostics with severity and repair hints.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {findings.length === 0 ? (
        <p className="text-sm text-zinc-500">No findings yet.</p>
      ) : (
        <div className="space-y-3">
          {findings.map((finding) => (
            <article
              key={finding.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    {finding.category} · {finding.severity} · {finding.status}
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-zinc-900">
                    {finding.title}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    {finding.description}
                  </p>
                  {finding.suggestion ? (
                    <p className="mt-2 text-sm text-zinc-700">
                      Suggestion: {finding.suggestion}
                    </p>
                  ) : null}
                  <p className="mt-2 font-mono text-xs text-zinc-400">
                    {finding.code}
                    {finding.autoRepairable ? " · auto-repairable" : ""}
                  </p>
                </div>
                {canManage &&
                ["open", "acknowledged", "failed"].includes(finding.status) ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                      disabled={pendingId === finding.id}
                      onClick={() => setStatus(finding.id, "acknowledged")}
                    >
                      Ack
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                      disabled={pendingId === finding.id}
                      onClick={() => setStatus(finding.id, "ignored")}
                    >
                      Ignore
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-60"
                      disabled={pendingId === finding.id}
                      onClick={() => setStatus(finding.id, "resolved")}
                    >
                      Resolve
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
