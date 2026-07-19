import type { GuardianOpLog } from "@/lib/guardian/types";

export function GuardianLogsPanel({ logs }: { logs: GuardianOpLog[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Log analysis
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Guardian operation audit trail used for error detection and analysis.
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-zinc-500">No Guardian logs yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Operation</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Request</th>
                <th className="px-3 py-2">Response / error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 text-zinc-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-zinc-900">{log.operation}</td>
                  <td className="px-3 py-2 text-zinc-600">{log.status}</td>
                  <td className="px-3 py-2 text-zinc-600">
                    {log.requestSummary || "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {log.errorMessage || log.responseSummary || "—"}
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
