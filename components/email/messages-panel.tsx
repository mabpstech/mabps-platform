"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { EmailMessage, EmailTemplate } from "@/lib/email-engine/types";

export function EmailMessagesPanel({
  messages,
  templates,
}: {
  messages: EmailMessage[];
  templates: EmailTemplate[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p>Hello from MABPS Email Engine.</p>");
  const [kind, setKind] = useState<"transactional" | "marketing">(
    "transactional",
  );
  const [templateId, setTemplateId] = useState("");

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/email/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          html,
          kind,
          templateId: templateId || null,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: EmailMessage;
      };
      if (!response.ok) throw new Error(data.error || "Unable to send.");
      setSuccess(
        data.message?.status === "failed"
          ? `Send failed: ${data.message.errorMessage || "unknown error"}`
          : "Email queued/sent.",
      );
      setTo("");
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
        <h1 className="text-2xl font-semibold text-zinc-900">Messages</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Transactional and marketing sends with delivery, open, and click
          tracking.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={sendMessage}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
      >
        <div>
          <label className={authLabelClassName}>To</label>
          <input
            className={authInputClassName}
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Kind</label>
          <select
            className={authInputClassName}
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as "transactional" | "marketing")
            }
            disabled={pending}
          >
            <option value="transactional">Transactional</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Subject</label>
          <input
            className={authInputClassName}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Template (optional)</label>
          <select
            className={authInputClassName}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={pending}
          >
            <option value="">None</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.category})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>HTML</label>
          <textarea
            className={`${authInputClassName} min-h-28 font-mono text-xs`}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            {pending ? "Sending…" : "Send email"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">To</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Opens / Clicks</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={6}>
                  No messages yet.
                </td>
              </tr>
            ) : (
              messages.map((message) => (
                <tr key={message.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                    {new Date(message.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{message.toEmail}</td>
                  <td className="px-4 py-3 text-zinc-700">{message.subject}</td>
                  <td className="px-4 py-3 text-zinc-600">{message.kind}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        message.status === "failed" ||
                        message.status === "bounced"
                          ? "text-red-600"
                          : message.status === "opened" ||
                              message.status === "clicked"
                            ? "text-emerald-700"
                            : "text-zinc-700"
                      }
                    >
                      {message.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {message.openCount} / {message.clickCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
