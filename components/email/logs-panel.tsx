import type { EmailEvent, EmailLog } from "@/lib/email-engine/types";

export function EmailLogsPanel({
  logs,
  events,
}: {
  logs: EmailLog[];
  events: EmailEvent[];
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Email logs</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Delivery operations plus open, click, bounce, and provider webhook
          events.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Delivery logs</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Operation</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                    No email logs yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-100 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {log.operation}
                    </td>
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
                    <td className="px-4 py-3 text-zinc-600">
                      {log.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <p>{log.requestSummary || "—"}</p>
                      {log.errorMessage ? (
                        <p className="mt-1 text-xs text-red-600">
                          {log.errorMessage}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Tracking events</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">URL</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                    No tracking events yet.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-b border-zinc-100">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                      {new Date(event.occurredAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{event.type}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {event.email || "—"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-zinc-500">
                      {event.url || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
