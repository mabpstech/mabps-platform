"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { GuardianScan } from "@/lib/guardian/types";

export function GuardianScansPanel({
  scans,
  canManage,
}: {
  scans: GuardianScan[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Scan failed.");
      setSuccess("Diagnostic scan completed.");
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
            Diagnostic scans
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            History of automatic and manual system diagnostics.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} sm:w-auto`}
            disabled={pending}
            onClick={runScan}
          >
            {pending ? "Scanning…" : "Run scan"}
          </button>
        ) : null}
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {scans.length === 0 ? (
        <p className="text-sm text-zinc-500">No scans yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Health</th>
                <th className="px-3 py-2">Findings</th>
                <th className="px-3 py-2">Trigger</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 text-zinc-500">
                    {new Date(scan.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-zinc-900">{scan.status}</td>
                  <td className="px-3 py-2 capitalize text-zinc-600">
                    {scan.healthStatus}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {scan.findingsCount}
                    {scan.criticalCount
                      ? ` · ${scan.criticalCount} critical`
                      : ""}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{scan.trigger}</td>
                  <td className="px-3 py-2 text-zinc-600">
                    {scan.durationMs != null ? `${scan.durationMs}ms` : "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    <Link
                      href={`/guardian/findings?scanId=${scan.id}`}
                      className="hover:underline"
                    >
                      {scan.summary || scan.id.slice(0, 8)}
                    </Link>
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
