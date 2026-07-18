import type { CrmTimelineEvent } from "@/lib/crm/types";
import { formatDateTime } from "@/components/crm/format";

export function CustomerTimeline({
  events,
}: {
  events: CrmTimelineEvent[];
}) {
  if (!events.length) {
    return (
      <p className="text-sm text-zinc-500">
        Timeline is empty. Notes, activities, tasks, and deal changes will appear
        here.
      </p>
    );
  }

  return (
    <ol className="space-y-4 border-l border-zinc-200 pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-400" />
          <p className="text-sm font-medium text-zinc-900">{event.title}</p>
          {event.summary ? (
            <p className="mt-0.5 text-sm text-zinc-600">{event.summary}</p>
          ) : null}
          <p className="mt-1 text-xs text-zinc-400">
            {formatDateTime(event.occurredAt)} · {event.eventType}
          </p>
        </li>
      ))}
    </ol>
  );
}
