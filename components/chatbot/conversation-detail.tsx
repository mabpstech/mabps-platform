"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type {
  ChatbotBot,
  ChatbotConversation,
  ChatbotHandoff,
  ChatbotMessage,
} from "@/lib/chatbot/types";

export function ConversationDetail({
  conversation,
  bot,
  messages: initialMessages,
  handoff,
}: {
  conversation: ChatbotConversation;
  bot: ChatbotBot | null;
  messages: ChatbotMessage[];
  handoff: ChatbotHandoff | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chatbot/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        message?: ChatbotMessage;
      };
      if (!response.ok) throw new Error(data.error || "Unable to send reply.");
      if (data.message) setMessages((prev) => [...prev, data.message!]);
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reply.");
    } finally {
      setPending(false);
    }
  }

  async function handoffAction(action: "claim" | "resolve" | "request") {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chatbot/conversations/${conversation.id}/handoff`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Handoff action failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Handoff action failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {conversation.visitorName ||
              conversation.visitorEmail ||
              "Conversation"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {bot?.name || "Bot"} · {conversation.channel} ·{" "}
            {conversation.status}
            {conversation.crmLeadId ? (
              <>
                {" · "}
                <Link
                  href={`/crm/leads/${conversation.crmLeadId}`}
                  className="underline"
                >
                  CRM lead
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {handoff?.status === "requested" ? (
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-3 py-1.5`}
              onClick={() => handoffAction("claim")}
              disabled={pending}
            >
              Claim handoff
            </button>
          ) : null}
          {handoff && handoff.status !== "resolved" ? (
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
              onClick={() => handoffAction("resolve")}
              disabled={pending}
            >
              Resolve & resume AI
            </button>
          ) : (
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
              onClick={() => handoffAction("request")}
              disabled={pending}
            >
              Request handoff
            </button>
          )}
        </div>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-2xl rounded-lg px-3 py-2 text-sm ${
              message.role === "user"
                ? "ml-auto bg-zinc-900 text-white"
                : message.role === "human_agent"
                  ? "bg-amber-50 text-amber-950"
                  : message.role === "system"
                    ? "bg-zinc-50 text-zinc-500"
                    : "bg-zinc-100 text-zinc-800"
            }`}
          >
            <p className="mb-1 text-[11px] uppercase tracking-wide opacity-70">
              {message.role}
            </p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {!messages.length ? (
          <p className="text-sm text-zinc-500">No messages yet.</p>
        ) : null}
      </div>

      <form onSubmit={sendReply} className="flex flex-wrap gap-3">
        <input
          className={`${authInputClassName} min-w-[240px] flex-1`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Reply as human agent…"
          required
          disabled={pending}
        />
        <button
          type="submit"
          className={`${authButtonClassName} !w-auto px-4`}
          disabled={pending}
        >
          Send
        </button>
      </form>
    </div>
  );
}
