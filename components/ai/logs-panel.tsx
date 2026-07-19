import type { AiLog } from "@/lib/ai/types";

export function LogsPanel({ logs }: { logs: AiLog[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">AI logs</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Invocation history with providers, tokens, credits, latency, and tool
          usage.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tokens</th>
              <th className="px-4 py-3 font-medium">Credits</th>
              <th className="px-4 py-3 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={7}>
                  No AI logs yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-100 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{log.provider}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.model}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        log.status === "success"
                          ? "text-emerald-700"
                          : "text-red-600"
                      }
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.totalTokens}</td>
                  <td className="px-4 py-3">{log.credits}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    <p>{log.requestSummary || "—"}</p>
                    {log.errorMessage ? (
                      <p className="mt-1 text-xs text-red-600">
                        {log.errorMessage}
                      </p>
                    ) : null}
                    {log.toolNames.length ? (
                      <p className="mt-1 text-xs text-zinc-400">
                        tools: {log.toolNames.join(", ")}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
