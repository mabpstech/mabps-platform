"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { GuardianOverviewStats } from "@/lib/guardian/types";

export function GuardianOverview({
  stats,
  canManage,
}: {
  stats: GuardianOverviewStats;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cards = [
    { label: "Health", value: stats.healthStatus },
    { label: "Open findings", value: stats.openFindings },
    { label: "Critical", value: stats.criticalFindings },
    { label: "High", value: stats.highFindings },
    { label: "Scans", value: stats.scans },
    { label: "Scans today", value: stats.scansToday },
    { label: "Suggested repairs", value: stats.suggestedRepairs },
    { label: "Applied repairs", value: stats.appliedRepairs },
  ];

  async function runScan() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/guardian/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as {
        error?: string;
        scan?: { summary?: string | null };
      };
      if (!response.ok) throw new Error(data.error || "Scan failed.");
      setSuccess(data.scan?.summary || "Diagnostic scan completed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            AI Guardian
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Self-healing diagnostics for database, APIs, deployments, env vars,
            dependencies, performance, security, and logs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <button
              type="button"
              className={`${authButtonClassName} sm:w-auto`}
              disabled={pending}
              onClick={runScan}
            >
              {pending ? "Scanning…" : "Run full scan"}
            </button>
          ) : null}
          <Link
            href="/guardian/repairs"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Repairs
          </Link>
        </div>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-semibold capitalize text-zinc-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Monitoring
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            Monitor {stats.monitoringEnabled ? "on" : "off"} · Auto-scan{" "}
            {stats.autoScanEnabled ? "on" : "off"} · AI troubleshoot{" "}
            {stats.aiTroubleshootingEnabled ? "on" : "off"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Last scan {stats.lastScanAt
              ? new Date(stats.lastScanAt).toLocaleString()
              : "never"}
            {stats.lastScanHealth ? ` · ${stats.lastScanHealth}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Open findings by category
          </p>
          <p className="mt-1 text-sm text-zinc-700">
            {Object.entries(stats.checkBreakdown)
              .filter(([, count]) => count > 0)
              .map(([category, count]) => `${category} ${count}`)
              .join(" · ") || "None"}
          </p>
        </div>
      </div>
    </div>
  );
}
