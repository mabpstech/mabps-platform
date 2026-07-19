"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import { AI_MODEL_OPTIONS } from "@/lib/ai/defaults";
import type {
  AiConversation,
  AiMessage,
  AiProviderId,
  AiSettings,
} from "@/lib/ai/types";
import { AI_PROVIDERS } from "@/lib/ai/types";

export function ChatPanel({
  conversations,
  initialConversation,
  initialMessages,
  settings,
}: {
  conversations: AiConversation[];
  initialConversation: AiConversation | null;
  initialMessages: AiMessage[];
  settings: AiSettings;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [content, setContent] = useState("");
  const [provider, setProvider] = useState<AiProviderId>(
    initialConversation?.provider || settings.defaultProvider,
  );
  const [model, setModel] = useState(
    initialConversation?.model ||
      settings.defaultModel ||
      AI_MODEL_OPTIONS[settings.defaultProvider][0]?.id ||
      "",
  );
  const [activeId, setActiveId] = useState<string | null>(
    initialConversation?.id ?? null,
  );
  const [messages, setMessages] = useState<AiMessage[]>(initialMessages);
  const [streamingText, setStreamingText] = useState("");

  useEffect(() => {
    setMessages(initialMessages);
    setActiveId(initialConversation?.id ?? null);
  }, [initialConversation?.id, initialMessages]);

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "tool"),
    [messages],
  );

  async function ensureConversation(): Promise<string> {
    if (activeId) return activeId;
    const response = await fetch("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model }),
    });
    const data = (await response.json()) as {
      error?: string;
      conversation?: AiConversation;
    };
    if (!response.ok || !data.conversation) {
      throw new Error(data.error || "Unable to create conversation.");
    }
    setActiveId(data.conversation.id);
    router.replace(`/ai/chat?conversationId=${data.conversation.id}`);
    return data.conversation.id;
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setPending(true);
    setError(null);
    setStreamingText("");

    try {
      const conversationId = await ensureConversation();
      const useStream = settings.streamingEnabled;
      const endpoint = useStream
        ? `/api/ai/conversations/${conversationId}/stream`
        : `/api/ai/conversations/${conversationId}/messages`;

      if (!useStream) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, provider, model }),
        });
        const data = (await response.json()) as {
          error?: string;
          userMessage?: AiMessage;
          assistantMessage?: AiMessage;
        };
        if (!response.ok) {
          throw new Error(data.error || "Unable to send message.");
        }
        setMessages((current) => [
          ...current,
          ...(data.userMessage ? [data.userMessage] : []),
          ...(data.assistantMessage ? [data.assistantMessage] : []),
        ]);
        setContent("");
        router.refresh();
        return;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, provider, model }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Unable to stream response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .find((entry) => entry.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          const eventPayload = JSON.parse(payload) as {
            type: string;
            text?: string;
            message?: AiMessage | string;
            content?: string;
          };

          if (
            eventPayload.type === "user_message" &&
            eventPayload.message &&
            typeof eventPayload.message !== "string"
          ) {
            setMessages((current) => [...current, eventPayload.message as AiMessage]);
          } else if (eventPayload.type === "delta" && eventPayload.text) {
            assembled += eventPayload.text;
            setStreamingText(assembled);
          } else if (
            eventPayload.type === "assistant_message" &&
            eventPayload.message &&
            typeof eventPayload.message !== "string"
          ) {
            setMessages((current) => [...current, eventPayload.message as AiMessage]);
            setStreamingText("");
          } else if (eventPayload.type === "error") {
            throw new Error(
              typeof eventPayload.message === "string"
                ? eventPayload.message
                : "Stream failed.",
            );
          }
        }
      }

      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setPending(false);
    }
  }

  async function startNew() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model }),
      });
      const data = (await response.json()) as {
        error?: string;
        conversation?: AiConversation;
      };
      if (!response.ok || !data.conversation) {
        throw new Error(data.error || "Unable to create conversation.");
      }
      setActiveId(data.conversation.id);
      setMessages([]);
      setStreamingText("");
      router.push(`/ai/chat?conversationId=${data.conversation.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create conversation.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">AI chat</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ask the workspace assistant. It can use tools across CRM, chatbot,
            knowledge, memory, automation, websites, analytics, and billing.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          disabled={pending}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          New chat
        </button>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-zinc-200 bg-white p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Conversations
          </p>
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <p className="px-2 py-3 text-sm text-zinc-500">No chats yet.</p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    activeId === conversation.id
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                  onClick={() =>
                    router.push(
                      `/ai/chat?conversationId=${conversation.id}`,
                    )
                  }
                >
                  {conversation.title}
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-[480px] flex-col rounded-xl border border-zinc-200 bg-white">
          <div className="grid gap-3 border-b border-zinc-200 p-4 sm:grid-cols-2">
            <div>
              <label className={authLabelClassName}>Provider</label>
              <select
                className={authInputClassName}
                value={provider}
                disabled={pending}
                onChange={(event) => {
                  const next = event.target.value as AiProviderId;
                  setProvider(next);
                  setModel(AI_MODEL_OPTIONS[next][0]?.id || "");
                }}
              >
                {AI_PROVIDERS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={authLabelClassName}>Model</label>
              <select
                className={authInputClassName}
                value={model}
                disabled={pending}
                onChange={(event) => setModel(event.target.value)}
              >
                {AI_MODEL_OPTIONS[provider].map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {visibleMessages.length === 0 && !streamingText ? (
              <p className="text-sm text-zinc-500">
                Start a conversation to query workspace data or draft next
                actions.
              </p>
            ) : null}
            {visibleMessages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  message.role === "user"
                    ? "ml-auto bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-800"
                }`}
              >
                {message.content}
              </div>
            ))}
            {streamingText ? (
              <div className="max-w-[90%] rounded-lg bg-zinc-100 px-3 py-2 text-sm whitespace-pre-wrap text-zinc-800">
                {streamingText}
              </div>
            ) : null}
          </div>

          <form onSubmit={send} className="border-t border-zinc-200 p-4">
            <textarea
              className={`${authInputClassName} min-h-24`}
              value={content}
              disabled={pending}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Ask about leads, knowledge, automations, billing…"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className={`${authButtonClassName} !w-auto px-4`}
                disabled={pending || !content.trim()}
              >
                {pending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
