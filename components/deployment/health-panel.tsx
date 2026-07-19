"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type {
  DeploymentHealthCheck,
  DeploymentMonitorEvent,
  DeploymentProject,
} from "@/lib/deployment/types";

export function DeploymentHealthPanel({
  checks,
  events,
  projects,
  canManage,
}: {
  checks: DeploymentHealthCheck[];
  events: DeploymentMonitorEvent[];
  projects: DeploymentProject[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || id.slice(0, 8);

  async function runAll() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/deployment/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Health check failed.");
      setSuccess("Health checks completed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Health & monitoring
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Probe published URLs and review infrastructure monitor events.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} sm:w-auto`}
            disabled={pending}
            onClick={runAll}
          >
            {pending ? "Running…" : "Run health checks"}
          </button>
        ) : null}
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Recent checks</h2>
        {checks.length === 0 ? (
          <p className="text-sm text-zinc-500">No health checks yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">HTTP</th>
                  <th className="px-3 py-2">Latency</th>
                  <th className="px-3 py-2">URL</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={check.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 text-zinc-500">
                      {new Date(check.checkedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-zinc-900">
                      {projectName(check.projectId)}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{check.status}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {check.httpStatus ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {check.latencyMs != null ? `${check.latencyMs}ms` : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                      {check.url}
                    </td>
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
