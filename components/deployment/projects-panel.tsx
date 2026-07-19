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
import type { DeploymentProject } from "@/lib/deployment/types";

export function DeploymentProjectsPanel({
  projects,
  canManage,
}: {
  projects: DeploymentProject[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"vercel" | "cloudflare" | "manual">(
    "vercel",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending("create");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/deployment/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, provider }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create.");
      setName("");
      setSuccess("Project created.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create.");
    } finally {
      setPending(null);
    }
  }

  async function publish(projectId: string) {
    if (!canManage) return;
    setPending(projectId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/deployment/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = (await response.json()) as {
        error?: string;
        simulated?: boolean;
      };
      if (!response.ok) throw new Error(data.error || "Publish failed.");
      setSuccess(
        data.simulated
          ? "Published (simulated — add provider tokens for live deploys)."
          : "Published successfully.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Projects</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure deployable projects and run the publish pipeline.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {canManage ? (
        <form
          onSubmit={createProject}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-zinc-900">New project</h2>
          <div>
            <label className={authLabelClassName} htmlFor="project-name">
              Name
            </label>
            <input
              id="project-name"
              className={authInputClassName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing site"
              required
              disabled={Boolean(pending)}
            />
          </div>
          <div>
            <label className={authLabelClassName} htmlFor="project-provider">
              Provider
            </label>
            <select
              id="project-provider"
              className={authInputClassName}
              value={provider}
              onChange={(e) =>
                setProvider(e.target.value as typeof provider)
              }
              disabled={Boolean(pending)}
            >
              <option value="vercel">Vercel</option>
              <option value="cloudflare">Cloudflare Pages</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <button
            type="submit"
            className={authButtonClassName}
            disabled={Boolean(pending)}
          >
            {pending === "create" ? "Creating…" : "Create project"}
          </button>
        </form>
      ) : null}

      {projects.length === 0 ? (
        <p className="text-sm text-zinc-500">No projects yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last published</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    <p className="font-medium text-zinc-900">{project.name}</p>
                    <p className="font-mono text-xs text-zinc-500">
                      {project.slug}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{project.provider}</td>
                  <td className="px-3 py-2 text-zinc-600">{project.status}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {project.lastPublishedAt
                      ? new Date(project.lastPublishedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canManage && project.status === "active" ? (
                      <button
                        type="button"
                        className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-60"
                        disabled={Boolean(pending)}
                        onClick={() => publish(project.id)}
                      >
                        {pending === project.id ? "Publishing…" : "Publish"}
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
