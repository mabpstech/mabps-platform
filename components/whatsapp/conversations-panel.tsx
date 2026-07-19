"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { WhatsAppConversation, WhatsAppMessage } from "@/lib/whatsapp/types";

export function ConversationsPanel({
  conversations,
  selected,
  messages,
}: {
  conversations: WhatsAppConversation[];
  selected: WhatsAppConversation | null;
  messages: WhatsAppMessage[];
}) {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const recipient = to.trim() || selected?.phone || "";
      const response = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient, text }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: WhatsAppMessage;
      };
      if (!response.ok) throw new Error(data.error || "Unable to send.");
      setText("");
      setSuccess("Message sent.");
      if (data.message?.conversationId) {
        router.push(`/whatsapp/conversations?id=${data.message.conversationId}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Conversations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Conversation history and outbound replies over WhatsApp Cloud API.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={sendMessage}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_2fr_auto]"
      >
        <div>
          <label className={authLabelClassName}>To</label>
          <input
            className={authInputClassName}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={selected?.phone || "+15551234567"}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Message</label>
          <input
            className={authInputClassName}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            disabled={pending}
            required
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            Send
          </button>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {conversations.length === 0 ? (
              <li className="px-4 py-6 text-sm text-zinc-500">
                No conversations yet.
              </li>
            ) : (
              conversations.map((conversation) => {
                const active = selected?.id === conversation.id;
                return (
                  <li key={conversation.id}>
                    <Link
                      href={`/whatsapp/conversations?id=${conversation.id}`}
                      className={`block px-4 py-3 text-sm ${
                        active ? "bg-zinc-100" : "hover:bg-zinc-50"
                      }`}
                    >
                      <p className="font-medium text-zinc-900">
                        +{conversation.phone}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {conversation.status} ·{" "}
                        {conversation.lastMessageAt
                          ? new Date(conversation.lastMessageAt).toLocaleString()
                          : "No messages"}
                      </p>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          {!selected ? (
            <p className="text-sm text-zinc-500">
              Select a conversation to view history.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  +{selected.phone}
                </h2>
                <p className="text-xs text-zinc-500">
                  Status: {selected.status}
                  {selected.chatbotConversationId
                    ? " · Linked to chatbot"
                    : ""}
                </p>
              </div>
              <div className="max-h-[28rem] space-y-3 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-sm text-zinc-500">No messages.</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        message.direction === "outbound"
                          ? "ml-8 bg-zinc-900 text-white"
                          : "mr-8 bg-zinc-100 text-zinc-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">
                        {message.content || `[${message.type}]`}
                      </p>
                      <p
                        className={`mt-1 text-[11px] ${
                          message.direction === "outbound"
                            ? "text-zinc-300"
                            : "text-zinc-500"
                        }`}
                      >
                        {message.status} ·{" "}
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
