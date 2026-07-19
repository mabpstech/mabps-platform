import Link from "next/link";
import type { EmailOverviewStats } from "@/lib/email-engine/types";

export function EmailOverview({
  stats,
  canManage,
}: {
  stats: EmailOverviewStats;
  canManage: boolean;
}) {
  const cards = [
    { label: "Contacts", value: stats.contacts },
    { label: "Templates", value: stats.templates },
    { label: "Messages today", value: stats.messagesToday },
    { label: "Active campaigns", value: stats.campaignsActive },
    { label: "Opens today", value: stats.opensToday },
    { label: "Clicks today", value: stats.clicksToday },
    { label: "Bounces today", value: stats.bouncesToday },
    { label: "Logs today", value: stats.logsToday },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Email</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Multi-tenant email engine with SMTP, Resend, and Amazon SES —
            templates, transactional and marketing sends, campaigns, tracking,
            CRM sync, automation, and analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/email/messages"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
          >
            Send message
          </Link>
          {canManage ? (
            <Link
              href="/email/settings"
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
            Connection
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {stats.isConnected ? "Connected" : "Not connected"} ·{" "}
            {stats.provider.toUpperCase()}
            {stats.fromEmail ? ` · ${stats.fromEmail}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Tracking
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            Opens {stats.openTrackingEnabled ? "on" : "off"} · Clicks{" "}
            {stats.clickTrackingEnabled ? "on" : "off"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            CRM sync
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {stats.crmSyncEnabled ? "Enabled" : "Disabled"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Automation / Analytics
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {stats.automationEnabled ? "Automation on" : "Automation off"} ·{" "}
            {stats.analyticsEnabled ? "Analytics on" : "Analytics off"}
          </p>
        </div>
      </div>
    </div>
  );
}
