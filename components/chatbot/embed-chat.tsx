"use client";

import { useEffect, useState } from "react";
import type { ChatbotMessage } from "@/lib/chatbot/types";

/** Must match `VISITOR_SESSION_HEADER` in lib/chatbot/visitor-session.ts */
const VISITOR_SESSION_HEADER = "x-mabps-chatbot-session";

type PublicConfig = {
  bot: {
    name: string;
    welcomeMessage: string;
    leadCaptureEnabled: boolean;
    handoffEnabled: boolean;
  };
  widget: {
    title: string;
    primaryColor: string;
    position: string;
    launcherLabel: string;
  };
};

function storageKeys(publicKey: string) {
  const base = `mabps_chat_${publicKey}`;
  return {
    conversation: base,
    visitor: `${base}_visitor`,
    session: `${base}_session`,
  };
}

export function EmbedChat({ publicKey }: { publicKey: string }) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [content, setContent] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const configRes = await fetch(
          `/api/chatbot/public/${publicKey}/config`,
        );
        const configData = (await configRes.json()) as PublicConfig & {
          error?: string;
        };
        if (!configRes.ok) throw new Error(configData.error || "Unavailable");
        if (cancelled) return;
        setConfig(configData);

        const keys = storageKeys(publicKey);
        const storedConversation =
          typeof window !== "undefined"
            ? window.localStorage.getItem(keys.conversation)
            : null;
        const storedSecret =
          typeof window !== "undefined"
            ? window.localStorage.getItem(keys.session)
            : null;
        const sessionRes = await fetch(
          `/api/chatbot/public/${publicKey}/session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(storedSecret
                ? { [VISITOR_SESSION_HEADER]: storedSecret }
                : {}),
            },
            body: JSON.stringify({
              conversationId: storedConversation,
              sessionSecret: storedSecret,
              visitorId:
                typeof window !== "undefined"
                  ? window.localStorage.getItem(keys.visitor)
                  : null,
            }),
          },
        );
        const sessionData = (await sessionRes.json()) as {
          error?: string;
          conversation?: { id: string; visitorId?: string | null };
          sessionSecret?: string;
          messages?: ChatbotMessage[];
        };
        if (!sessionRes.ok) {
          throw new Error(sessionData.error || "Unable to start chat.");
        }
        if (cancelled) return;
        if (sessionData.conversation && sessionData.sessionSecret) {
          setConversationId(sessionData.conversation.id);
          setSessionSecret(sessionData.sessionSecret);
          window.localStorage.setItem(
            keys.conversation,
            sessionData.conversation.id,
          );
          window.localStorage.setItem(keys.session, sessionData.sessionSecret);
          if (sessionData.conversation.visitorId) {
            window.localStorage.setItem(
              keys.visitor,
              sessionData.conversation.visitorId,
            );
          }
        }
        setMessages(sessionData.messages || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load chat.");
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  function sessionHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      ...(sessionSecret ? { [VISITOR_SESSION_HEADER]: sessionSecret } : {}),
    };
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!conversationId || !content.trim() || !sessionSecret) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chatbot/public/${publicKey}/messages`,
        {
          method: "POST",
          headers: sessionHeaders(),
          body: JSON.stringify({
            conversationId,
            content,
            sessionSecret,
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        messages?: ChatbotMessage[];
      };
      if (!response.ok) throw new Error(data.error || "Unable to send.");
      setMessages(data.messages || []);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send.");
    } finally {
      setPending(false);
    }
  }

  async function submitLead(event: React.FormEvent) {
    event.preventDefault();
    if (!conversationId || !sessionSecret) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/chatbot/public/${publicKey}/lead`, {
        method: "POST",
        headers: sessionHeaders(),
        body: JSON.stringify({
          conversationId,
          sessionSecret,
          name: leadName,
          email: leadEmail,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save lead.");
      setLeadName("");
      setLeadEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save lead.");
    } finally {
      setPending(false);
    }
  }

  async function requestHandoff() {
    if (!conversationId || !sessionSecret) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chatbot/public/${publicKey}/handoff`,
        {
          method: "POST",
          headers: sessionHeaders(),
          body: JSON.stringify({ conversationId, sessionSecret }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to request handoff.");
      const refresh = await fetch(
        `/api/chatbot/public/${publicKey}/messages?conversationId=${encodeURIComponent(conversationId)}`,
        {
          headers: sessionSecret
            ? { [VISITOR_SESSION_HEADER]: sessionSecret }
            : {},
        },
      );
      const refreshData = (await refresh.json()) as {
        messages?: ChatbotMessage[];
      };
      setMessages(refreshData.messages || messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request handoff.");
    } finally {
      setPending(false);
    }
  }

  const color = config?.widget.primaryColor || "#18181b";

  return (
    <div className="flex h-screen flex-col bg-white text-zinc-900">
      <header
        className="px-4 py-3 text-white"
        style={{ backgroundColor: color }}
      >
        <p className="text-sm font-semibold">
          {config?.widget.title || "Chat"}
        </p>
        <p className="text-xs opacity-80">{config?.bot.name || "Assistant"}</p>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((message) =>
          message.role === "system" ? null : (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto text-white"
                  : "bg-zinc-100 text-zinc-800"
              }`}
              style={
                message.role === "user"
                  ? { backgroundColor: color }
                  : undefined
              }
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ),
        )}
      </div>

      {error ? (
        <p className="px-3 text-xs text-red-600">{error}</p>
      ) : null}

      {config?.bot.leadCaptureEnabled ? (
        <form
          onSubmit={submitLead}
          className="grid grid-cols-2 gap-2 border-t border-zinc-100 px-3 py-2"
        >
          <input
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs"
            placeholder="Name"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            disabled={pending}
          />
          <input
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs"
            placeholder="Email"
            value={leadEmail}
            onChange={(e) => setLeadEmail(e.target.value)}
            disabled={pending}
          />
          <button
            type="submit"
            className="col-span-2 rounded-md px-2 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: color }}
            disabled={pending}
          >
            Save my details
          </button>
        </form>
      ) : null}

      <form
        onSubmit={send}
        className="flex gap-2 border-t border-zinc-200 p-3"
      >
        <input
          className="flex-1 rounded-full border border-zinc-300 px-3 py-2 text-sm outline-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message…"
          disabled={pending || !conversationId || !sessionSecret}
        />
        <button
          type="submit"
          className="rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: color }}
          disabled={pending || !conversationId || !sessionSecret}
        >
          Send
        </button>
      </form>

      {config?.bot.handoffEnabled ? (
        <button
          type="button"
          onClick={requestHandoff}
          className="border-t border-zinc-100 px-3 py-2 text-center text-xs text-zinc-500 hover:text-zinc-800"
          disabled={pending || !conversationId || !sessionSecret}
        >
          Talk to a human
        </button>
      ) : null}
    </div>
  );
}
