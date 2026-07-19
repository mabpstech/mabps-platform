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
import type {
  DeploymentDomain,
  DeploymentProject,
} from "@/lib/deployment/types";

export function DeploymentDomainsPanel({
  domains,
  projects,
  canManage,
}: {
  domains: DeploymentDomain[];
  projects: DeploymentProject[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [hostname, setHostname] = useState("");
  const [dnsProvider, setDnsProvider] = useState("manual");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<{
    txtHost: string;
    txtValue: string;
    cnameHost: string;
    cnameValue: string | null;
  } | null>(null);

  async function addDomain(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending("add");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/deployment/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, hostname, dnsProvider, isPrimary: true }),
      });
      const data = (await response.json()) as {
        error?: string;
        instructions?: typeof instructions;
      };
      if (!response.ok) throw new Error(data.error || "Unable to add domain.");
      setHostname("");
      setInstructions(data.instructions || null);
      setSuccess("Domain added. Complete DNS verification.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add domain.");
    } finally {
      setPending(null);
    }
  }

  async function verify(domainId: string, force = false) {
    if (!canManage) return;
    setPending(domainId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/deployment/domains/${domainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", force }),
      });
      const data = (await response.json()) as {
        error?: string;
        dnsOk?: boolean;
        dnsError?: string | null;
      };
      if (!response.ok) throw new Error(data.error || "Verification failed.");
      setSuccess(
        data.dnsOk
          ? "Domain verified. SSL provisioning started."
          : data.dnsError || "Verification incomplete.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setPending(null);
    }
  }

  async function remove(domainId: string) {
    if (!canManage) return;
    setPending(domainId);
    setError(null);
    try {
      const response = await fetch(`/api/deployment/domains/${domainId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to remove.");
      setSuccess("Domain removed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove.");
    } finally {
      setPending(null);
    }
  }

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Custom domains</h1>
        <p className="mt-1 text-sm text-zinc-500">
          DNS verification, SSL management, and provider DNS helpers.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {instructions ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
          <p className="font-medium text-zinc-900">DNS records</p>
          <p className="mt-2 text-zinc-600">
            TXT host:{" "}
            <span className="font-mono text-zinc-900">{instructions.txtHost}</span>
          </p>
          <p className="mt-1 text-zinc-600">
            TXT value:{" "}
            <span className="font-mono text-zinc-900">
              {instructions.txtValue}
            </span>
          </p>
          {instructions.cnameValue ? (
            <p className="mt-1 text-zinc-600">
              CNAME {instructions.cnameHost} →{" "}
              <span className="font-mono text-zinc-900">
                {instructions.cnameValue}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {canManage && projects.length > 0 ? (
        <form
          onSubmit={addDomain}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-zinc-900">Add domain</h2>
          <div>
            <label className={authLabelClassName} htmlFor="domain-project">
              Project
            </label>
            <select
              id="domain-project"
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
            <label className={authLabelClassName} htmlFor="domain-host">
              Hostname
            </label>
            <input
              id="domain-host"
              className={authInputClassName}
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="www.example.com"
              required
              disabled={Boolean(pending)}
            />
          </div>
          <div>
            <label className={authLabelClassName} htmlFor="domain-dns">
              DNS provider
            </label>
            <select
              id="domain-dns"
              className={authInputClassName}
              value={dnsProvider}
              onChange={(e) => setDnsProvider(e.target.value)}
              disabled={Boolean(pending)}
            >
              <option value="manual">Manual</option>
              <option value="cloudflare">Cloudflare</option>
              <option value="vercel">Vercel</option>
            </select>
          </div>
          <button
            type="submit"
            className={authButtonClassName}
            disabled={Boolean(pending)}
          >
            {pending === "add" ? "Adding…" : "Add domain"}
          </button>
        </form>
      ) : null}

      {domains.length === 0 ? (
        <p className="text-sm text-zinc-500">No custom domains yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Hostname</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">SSL</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => (
                <tr key={domain.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 font-medium text-zinc-900">
                    {domain.hostname}
                    {domain.isPrimary ? (
                      <span className="ml-2 text-xs text-zinc-400">primary</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {projectName(domain.projectId)}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{domain.status}</td>
                  <td className="px-3 py-2 text-zinc-600">{domain.sslStatus}</td>
                  <td className="px-3 py-2 text-right">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        {domain.status !== "verified" ? (
                          <>
                            <button
                              type="button"
                              className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
                              disabled={Boolean(pending)}
                              onClick={() => verify(domain.id)}
                            >
                              Verify DNS
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
                              disabled={Boolean(pending)}
                              onClick={() => verify(domain.id, true)}
                            >
                              Force
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                          disabled={Boolean(pending)}
                          onClick={() => remove(domain.id)}
                        >
                          Remove
                        </button>
                      </div>
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
