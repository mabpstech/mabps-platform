"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { DeploymentEnvVarPublic } from "@/lib/deployment/repository";
import type { DeploymentProject } from "@/lib/deployment/types";

export function DeploymentEnvPanel({
  envVars,
  projects,
  canManage,
}: {
  envVars: DeploymentEnvVarPublic[];
  projects: DeploymentProject[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [target, setTarget] = useState("production");
  const [isSecret, setIsSecret] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || id.slice(0, 8);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending("save");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/deployment/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, key, value, target, isSecret }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      setKey("");
      setValue("");
      setSuccess("Environment variable saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(null);
    }
  }

  async function remove(envId: string) {
    if (!canManage) return;
    setPending(envId);
    setError(null);
    try {
      const response = await fetch(`/api/deployment/env/${envId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete.");
      setSuccess("Environment variable deleted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Environment variables
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Workspace-scoped secrets injected into the publish pipeline.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {canManage && projects.length > 0 ? (
        <form
          onSubmit={save}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-zinc-900">Add / update</h2>
          <div>
            <label className={authLabelClassName} htmlFor="env-project">
              Project
            </label>
            <select
              id="env-project"
              className={authInputClassName}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={Boolean(pending)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName} htmlFor="env-key">
              Key
            </label>
            <input
              id="env-key"
              className={authInputClassName}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="API_URL"
              required
              disabled={Boolean(pending)}
            />
          </div>
          <div>
            <label className={authLabelClassName} htmlFor="env-value">
              Value
            </label>
            <input
              id="env-value"
              className={authInputClassName}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              disabled={Boolean(pending)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={authLabelClassName} htmlFor="env-target">
                Target
              </label>
              <select
                id="env-target"
                className={authInputClassName}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={Boolean(pending)}
              >
                <option value="production">production</option>
                <option value="preview">preview</option>
                <option value="development">development</option>
                <option value="all">all</option>
              </select>
            </div>
            <label className="mt-7 flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                disabled={Boolean(pending)}
              />
              Secret (masked in UI)
            </label>
          </div>
          <button
            type="submit"
            className={authButtonClassName}
            disabled={Boolean(pending)}
          >
            {pending === "save" ? "Saving…" : "Save variable"}
          </button>
        </form>
      ) : null}

      {envVars.length === 0 ? (
        <p className="text-sm text-zinc-500">No environment variables yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {envVars.map((env) => (
                <tr key={env.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 font-mono text-zinc-900">
                    {env.key}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {projectName(env.projectId)}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{env.target}</td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                    {env.valueMasked || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canManage ? (
                      <button
                        type="button"
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                        disabled={Boolean(pending)}
                        onClick={() => remove(env.id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
