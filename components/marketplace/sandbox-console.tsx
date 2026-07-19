"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type {
  MarketplaceInstallWithListing,
  MarketplaceSandboxRun,
} from "@/lib/marketplace/types";

export function SandboxConsole({
  installs,
  runs,
}: {
  installs: MarketplaceInstallWithListing[];
  runs: MarketplaceSandboxRun[];
}) {
  const router = useRouter();
  const [installId, setInstallId] = useState(installs[0]?.id ?? "");
  const [hook, setHook] = useState(
    installs[0]?.listing.manifest.hooks[0] ?? "on_install",
  );
  const [payload, setPayload] = useState('{"leadId":"demo-lead"}');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = useMemo(
    () => installs.find((install) => install.id === installId) ?? null,
    [installs, installId],
  );

  const hooks = selected?.listing.manifest.hooks ?? ["on_install"];

  async function runSandbox(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      let parsed: Record<string, unknown> = {};
      if (payload.trim()) {
        parsed = JSON.parse(payload) as Record<string, unknown>;
      }
      const response = await fetch("/api/marketplace/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installId,
          hook,
          payload: parsed,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Sandbox run failed.");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to run sandbox.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Sandbox</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Securely execute declared plugin hooks with permission checks, timeout
          limits, and no arbitrary code evaluation.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <form
        onSubmit={runSandbox}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Install</label>
            <select
              className={authInputClassName}
              value={installId}
              onChange={(event) => {
                setInstallId(event.target.value);
                const next = installs.find(
                  (install) => install.id === event.target.value,
                );
                setHook(next?.listing.manifest.hooks[0] ?? "on_install");
              }}
              disabled={pending || !installs.length}
            >
              {installs.map((install) => (
                <option key={install.id} value={install.id}>
                  {install.listing.name} (v{install.version})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName}>Hook</label>
            <select
              className={authInputClassName}
              value={hook}
              onChange={(event) => setHook(event.target.value)}
              disabled={pending || !hooks.length}
            >
              {hooks.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={authLabelClassName}>Payload JSON</label>
          <textarea
            className={`${authInputClassName} font-mono text-xs`}
            rows={5}
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            disabled={pending}
          />
        </div>
        <button
          type="submit"
          className={`${authButtonClassName} !w-auto px-4`}
          disabled={pending || !installId}
        >
          {pending ? "Running…" : "Run in sandbox"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Hook</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-zinc-100 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{run.hook}</p>
                  {run.errorMessage ? (
                    <p className="mt-1 text-xs text-red-600">
                      {run.errorMessage}
                    </p>
                  ) : null}
                  {run.logs.length ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {run.logs.slice(-2).join(" · ")}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-600">{run.status}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {run.durationMs != null ? `${run.durationMs}ms` : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(run.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {!runs.length ? (
              <tr>
                <td className="px-4 py-8 text-zinc-500" colSpan={4}>
                  No sandbox runs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
