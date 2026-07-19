import Link from "next/link";
import type { NotificationOverviewStats } from "@/lib/notifications/types";

export function NotificationsOverview({
  stats,
  canManage,
}: {
  stats: NotificationOverviewStats;
  canManage: boolean;
}) {
  const cards = [
    { label: "Total", value: stats.total },
    { label: "Unread", value: stats.unread },
    { label: "Delivered today", value: stats.deliveredToday },
    { label: "Failed today", value: stats.failedToday },
    { label: "Templates", value: stats.templates },
    { label: "Subscriptions", value: stats.subscriptions },
    { label: "Logs today", value: stats.logsToday },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Multi-tenant notification center with in-app, push, email,
            WhatsApp, and browser channels — priorities, preferences,
            templates, CRM sync, automation, and AI tools.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/notifications/center"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
          >
            Open center
          </Link>
          {canManage ? (
            <Link
              href="/notifications/settings"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Settings
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Channels
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            In-app {stats.inAppEnabled ? "on" : "off"} · Push{" "}
            {stats.pushEnabled ? "on" : "off"} · Email{" "}
            {stats.emailEnabled ? "on" : "off"} · WhatsApp{" "}
            {stats.whatsappEnabled ? "on" : "off"} · Browser{" "}
            {stats.browserEnabled ? "on" : "off"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Integrations
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            CRM {stats.crmSyncEnabled ? "on" : "off"} · Automation{" "}
            {stats.automationEnabled ? "on" : "off"} · Analytics{" "}
            {stats.analyticsEnabled ? "on" : "off"}
          </p>
        </div>
      </div>
    </div>
  );
}
