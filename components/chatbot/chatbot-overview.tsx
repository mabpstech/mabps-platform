"use client";

import Link from "next/link";
import type { ChatbotOverviewStats } from "@/lib/chatbot/types";

export function ChatbotOverview({ stats }: { stats: ChatbotOverviewStats }) {
  const cards = [
    { label: "Bots", value: stats.bots, href: "/chatbot/bots" },
    { label: "Active bots", value: stats.activeBots, href: "/chatbot/bots" },
    {
      label: "Knowledge sources",
      value: stats.knowledgeSources,
      href: "/chatbot/knowledge",
    },
    {
      label: "Indexed sources",
      value: stats.readySources,
      href: "/chatbot/knowledge",
    },
    {
      label: "Conversations",
      value: stats.conversations,
      href: "/chatbot/conversations",
    },
    {
      label: "Open handoffs",
      value: stats.openHandoffs,
      href: "/chatbot/conversations?status=handoff_requested",
    },
    {
      label: "Leads captured",
      value: stats.leadsCaptured,
      href: "/crm/leads?source=website",
    },
    {
      label: "Messages today",
      value: stats.messagesToday,
      href: "/chatbot/conversations",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Chatbot
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Multi-tenant AI assistants with knowledge base, memory, human handoff,
          website widget, and WhatsApp-ready channels.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
          >
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium text-zinc-900">Get started</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>
            Add an AI provider key under{" "}
            <Link href="/chatbot/providers" className="underline">
              AI providers
            </Link>
            .
          </li>
          <li>
            Upload PDF/DOCX/TXT or website URLs in{" "}
            <Link href="/chatbot/knowledge" className="underline">
              Knowledge
            </Link>
            .
          </li>
          <li>
            Copy the embed snippet from{" "}
            <Link href="/chatbot/widget" className="underline">
              Widget
            </Link>
            .
          </li>
          <li>
            Monitor chats and claim handoffs in{" "}
            <Link href="/chatbot/conversations" className="underline">
              Inbox
            </Link>
            .
          </li>
        </ol>
      </div>
    </div>
  );
}
