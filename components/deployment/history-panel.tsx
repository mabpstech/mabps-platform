"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authErrorClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type {
  DeploymentBuildLog,
  DeploymentProject,
  DeploymentRecord,
} from "@/lib/deployment/types";

export function DeploymentHistoryPanel({
  deployments,
  projects,
  canManage,
  initialLogs = {},
}: {
  deployments: DeploymentRecord[];
  projects: DeploymentProject[];
  canManage: boolean;
  initialLogs?: Record<string, DeploymentBuildLog[]>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logs, setLogs] = useState(initialLogs);

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || id.slice(0, 8);

  async function loadLogs(deploymentId: string) {
    if (logs[deploymentId]) {
      setExpanded(expanded === deploymentId ? null : deploymentId);
      return;
    }
    setPending(`logs-${deploymentId}`);
    try {
      const response = await fetch(
        `/api/deployment/deployments/${deploymentId}/logs`,
      );
      const data = (await response.json()) as {
        error?: string;
        logs?: DeploymentBuildLog[];
      };
      if (!response.ok) throw new Error(data.error || "Unable to load logs.");
      setLogs((current) => ({ ...current, [deploymentId]: data.logs || [] }));
      setExpanded(deploymentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load logs.");
    } finally {
      setPending(null);
    }
  }

  async function rollback(deploymentId: string) {
    if (!canManage) return;
    setPending(deploymentId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `/api/deployment/deployments/${deploymentId}/rollback`,
        { method: "POST" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Rollback failed.");
      setSuccess("Rollback completed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rollback failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Deployment history
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Publish history, build logs, and rollback to prior releases.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {deployments.length === 0 ? (
        <p className="text-sm text-zinc-500">No deployments yet.</p>
      ) : (
        <div className="space-y-3">
          {deployments.map((deployment) => (
            <div
              key={deployment.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-zinc-900">
                    {projectName(deployment.projectId)} · {deployment.status}
                    {deployment.isRollback ? " · rollback" : ""}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {deployment.commitMessage || "—"}
                  </p>
                  <p className="mt-1 font-mono text-xs text-zinc-400">
                    {deployment.commitSha?.slice(0, 8) || "—"} ·{" "}
                    {deployment.provider} · {deployment.environment}
                  </p>
                  {deployment.url ? (
                    <a
                      href={deployment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-zinc-700 underline"
                    >
                      {deployment.url}
                    </a>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(deployment.createdAt).toLocaleString()}
                    {deployment.durationMs != null
                      ? ` · ${deployment.durationMs}ms`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
                    disabled={Boolean(pending)}
                    onClick={() => loadLogs(deployment.id)}
                  >
                    {pending === `logs-${deployment.id}`
                      ? "Loading…"
                      : expanded === deployment.id
                        ? "Hide logs"
                        : "Build logs"}
                  </button>
                  {canManage &&
                  (deployment.status === "published" ||
                    deployment.status === "ready") ? (
                    <button
                      type="button"
                      className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-60"
                      disabled={Boolean(pending)}
                      onClick={() => rollback(deployment.id)}
                    >
                      {pending === deployment.id ? "Rolling back…" : "Rollback"}
                    </button>
                  ) : null}
                </div>
              </div>

              {expanded === deployment.id ? (
                <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
                  {(logs[deployment.id] || [])
                    .map(
                      (log) =>
                        `[${log.level}] ${log.message}`,
                    )
                    .join("\n") || "No build logs."}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
