import type {
  AutomationRun,
  AutomationRunLog,
  AutomationRunStep,
  AutomationWorkflow,
} from "@/lib/automation/types";

export function RunDetail({
  run,
  workflow,
  steps,
  logs,
}: {
  run: AutomationRun;
  workflow: AutomationWorkflow | null;
  steps: AutomationRunStep[];
  logs: AutomationRunLog[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Run detail</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {workflow?.name ?? run.workflowId} · {run.status}
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
          <p className="mt-1 font-medium text-zinc-900">{run.status}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Trigger
          </p>
          <p className="mt-1 font-medium text-zinc-900">{run.triggerType}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Attempts
          </p>
          <p className="mt-1 font-medium text-zinc-900">
            {run.attempt}/{run.maxAttempts}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Error</p>
          <p className="mt-1 font-medium text-zinc-900">
            {run.errorMessage ?? "—"}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">Steps</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Node</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={step.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {step.nodeType}
                    <span className="mt-0.5 block font-mono text-xs text-zinc-400">
                      {step.nodeId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{step.nodeKind}</td>
                  <td className="px-4 py-3 text-zinc-600">{step.status}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {step.errorMessage ?? "—"}
                  </td>
                </tr>
              ))}
              {!steps.length ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                    No steps recorded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">Logs</h2>
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
            >
              <span className="mr-2 font-mono text-xs uppercase text-zinc-400">
                {log.level}
              </span>
              {log.message}
            </div>
          ))}
          {!logs.length ? (
            <p className="px-1 py-4 text-sm text-zinc-500">No logs.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">Trigger payload</h2>
        <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
          {JSON.stringify(run.triggerPayload, null, 2)}
        </pre>
      </section>
    </div>
  );
}
