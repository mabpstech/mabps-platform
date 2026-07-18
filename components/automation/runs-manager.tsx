"use client";

import Link from "next/link";
import type { AutomationRun, AutomationWorkflow } from "@/lib/automation/types";

export function RunsManager({
  runs,
  workflows,
}: {
  runs: AutomationRun[];
  workflows: AutomationWorkflow[];
}) {
  const workflowName = new Map(workflows.map((item) => [item.id, item.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Execution history
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Queue runs, retries, step results, and logs.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Workflow</th>
              <th className="px-4 py-3 font-medium">Trigger</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Attempt</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/automations/runs/${run.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {workflowName.get(run.workflowId) ?? run.workflowId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{run.triggerType}</td>
                <td className="px-4 py-3 text-zinc-600">{run.status}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {run.attempt}/{run.maxAttempts}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(run.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {!runs.length ? (
              <tr>
                <td className="px-4 py-8 text-zinc-500" colSpan={5}>
                  No runs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
