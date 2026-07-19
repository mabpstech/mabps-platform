import type {
  NotificationEvent,
  NotificationLog,
} from "@/lib/notifications/types";

export function NotificationsLogsPanel({
  logs,
  events,
}: {
  logs: NotificationLog[];
  events: NotificationEvent[];
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Logs</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Delivery operations and notification lifecycle events.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Operations</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-zinc-500">No logs yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Operation</th>
                  <th className="px-3 py-2">Channel</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 text-zinc-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-zinc-900">{log.operation}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {log.channel || "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{log.status}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {log.errorMessage ||
                        log.responseSummary ||
                        log.requestSummary ||
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Events</h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">No events yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Channel</th>
                  <th className="px-3 py-2">Notification</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 text-zinc-500">
                      {new Date(event.occurredAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-zinc-900">{event.type}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {event.channel || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                      {event.notificationId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
