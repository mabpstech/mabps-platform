"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type {
  GuardianCheckResult,
  GuardianMonitorEvent,
  GuardianOverviewStats,
  GuardianScan,
} from "@/lib/guardian/types";

export function GuardianHealthPanel({
  overview,
  lastScan,
  checks,
  events,
  canManage,
}: {
  overview: GuardianOverviewStats;
  lastScan: GuardianScan | null;
  checks: GuardianCheckResult[];
  events: GuardianMonitorEvent[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function runHealth() {
    if (!canManage) return;
    setPending("health");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/guardian/health", { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Health scan failed.");
      setSuccess("Health scan completed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health scan failed.");
    } finally {
      setPending(null);
    }
  }

  async function runMonitor() {
    if (!canManage) return;
    setPending("monitor");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/guardian/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(data.error || "Monitor tick failed.");
      setSuccess(data.message || "Monitor tick completed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Monitor tick failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Health monitoring
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Automatic health probes across database, APIs, deployments, and
            system metrics.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${authButtonClassName} sm:w-auto`}
              disabled={Boolean(pending)}
              onClick={runHealth}
            >
              {pending === "health" ? "Running…" : "Run health scan"}
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              disabled={Boolean(pending)}
              onClick={runMonitor}
            >
              {pending === "monitor" ? "Running…" : "Force monitor tick"}
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-400">
          Current health
        </p>
        <p className="mt-1 text-2xl font-semibold capitalize text-zinc-900">
          {overview.healthStatus}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Last scan{" "}
          {lastScan
            ? `${lastScan.status} · ${lastScan.healthStatus} · ${lastScan.summary || "—"}`
            : "none yet"}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Latest check results
        </h2>
        {checks.length === 0 ? (
          <p className="text-sm text-zinc-500">No check results yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Check</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Latency</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={check.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 text-zinc-900">{check.category}</td>
                    <td className="px-3 py-2 text-zinc-700">{check.title}</td>
                    <td className="px-3 py-2 text-zinc-600">{check.status}</td>
                    <td className="px-3 py-2 text-zinc-600">{check.severity}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {check.latencyMs != null ? `${check.latencyMs}ms` : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{check.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Monitor events</h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">No monitor events yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 text-zinc-500">
                      {new Date(event.occurredAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-zinc-900">{event.type}</td>
                    <td className="px-3 py-2 text-zinc-600">{event.severity}</td>
                    <td className="px-3 py-2 text-zinc-900">{event.title}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {event.message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
