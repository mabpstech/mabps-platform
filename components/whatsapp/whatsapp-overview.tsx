import Link from "next/link";
import type { WhatsAppOverviewStats } from "@/lib/whatsapp/types";

export function WhatsAppOverview({
  stats,
  canManage,
}: {
  stats: WhatsAppOverviewStats;
  canManage: boolean;
}) {
  const cards = [
    { label: "Contacts", value: stats.contacts },
    { label: "Conversations", value: stats.conversations },
    { label: "Messages today", value: stats.messagesToday },
    { label: "Approved templates", value: stats.templatesApproved },
    { label: "Active broadcasts", value: stats.broadcastsActive },
    { label: "Logs today", value: stats.logsToday },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">WhatsApp</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Multi-tenant WhatsApp Cloud API integration with CRM sync, chatbot
            routing, automation triggers, templates, media, and broadcasts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/whatsapp/conversations"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
          >
            Conversations
          </Link>
          {canManage ? (
            <Link
              href="/whatsapp/settings"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Settings
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            {stats.isConnected ? "Connected" : "Not connected"}
            {stats.displayPhoneNumber ? ` · ${stats.displayPhoneNumber}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Business
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {stats.businessName || "—"}
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
            Chatbot / Automation
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {stats.chatbotEnabled ? "Chatbot on" : "Chatbot off"} ·{" "}
            {stats.automationEnabled ? "Automation on" : "Automation off"}
          </p>
        </div>
      </div>
    </div>
  );
}
