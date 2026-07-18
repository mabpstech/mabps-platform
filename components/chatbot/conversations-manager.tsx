"use client";

import Link from "next/link";
import type { ChatbotBot, ChatbotConversation } from "@/lib/chatbot/types";

export function ConversationsManager({
  conversations,
  bots,
}: {
  conversations: ChatbotConversation[];
  bots: ChatbotBot[];
}) {
  const botName = (botId: string) =>
    bots.find((bot) => bot.id === botId)?.name || "Bot";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Inbox</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Conversations across widget and API channels. Claim handoffs to reply
          as a human.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Visitor</th>
              <th className="px-4 py-3 font-medium">Bot</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">CRM lead</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((conversation) => (
              <tr key={conversation.id} className="border-b border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/chatbot/conversations/${conversation.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {conversation.visitorName ||
                      conversation.visitorEmail ||
                      "Anonymous visitor"}
                  </Link>
                  {conversation.visitorEmail ? (
                    <p className="text-xs text-zinc-400">
                      {conversation.visitorEmail}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {botName(conversation.botId)}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {conversation.channel}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {conversation.status}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {conversation.crmLeadId ? (
                    <Link
                      href={`/crm/leads/${conversation.crmLeadId}`}
                      className="underline"
                    >
                      View lead
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {(conversation.lastMessageAt || conversation.createdAt).slice(
                    0,
                    19,
                  )}
                </td>
              </tr>
            ))}
            {!conversations.length ? (
              <tr>
                <td className="px-4 py-8 text-zinc-500" colSpan={6}>
                  No conversations yet. Embed the widget to start receiving
                  chats.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
