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
import type { WhatsAppBroadcast } from "@/lib/whatsapp/types";

export function BroadcastsPanel({
  broadcasts,
  canManage,
}: {
  broadcasts: WhatsAppBroadcast[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");

  async function createBroadcast(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/whatsapp/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          templateName,
          templateLanguage,
          allContacts: true,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create.");
      setName("");
      setTemplateName("");
      setSuccess("Broadcast created with all WhatsApp contacts.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create.");
    } finally {
      setPending(false);
    }
  }

  async function sendBroadcast(broadcastId: string) {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/whatsapp/broadcasts/${broadcastId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to send.");
      setSuccess("Broadcast send completed.");
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
        <h1 className="text-2xl font-semibold text-zinc-900">Broadcasts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Template-based broadcasts to synced WhatsApp contacts.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {canManage ? (
        <form
          onSubmit={createBroadcast}
          className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-3"
        >
          <div>
            <label className={authLabelClassName}>Name</label>
            <input
              className={authInputClassName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Template name</label>
            <input
              className={authInputClassName}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Language</label>
            <input
              className={authInputClassName}
              value={templateLanguage}
              onChange={(e) => setTemplateLanguage(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className={`${authButtonClassName} !w-auto px-4`}
              disabled={pending}
            >
              Create broadcast (all contacts)
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Sent / Failed</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {broadcasts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={6}>
                  No broadcasts yet.
                </td>
              </tr>
            ) : (
              broadcasts.map((broadcast) => (
                <tr key={broadcast.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {broadcast.name}
                  </td>
                  <td className="px-4 py-3">
                    {broadcast.templateName} ({broadcast.templateLanguage})
                  </td>
                  <td className="px-4 py-3">{broadcast.status}</td>
                  <td className="px-4 py-3">{broadcast.totalRecipients}</td>
                  <td className="px-4 py-3">
                    {broadcast.sentCount} / {broadcast.failedCount}
                  </td>
                  <td className="px-4 py-3">
                    {canManage &&
                    (broadcast.status === "draft" ||
                      broadcast.status === "scheduled" ||
                      broadcast.status === "failed") ? (
                      <button
                        type="button"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                        onClick={() => sendBroadcast(broadcast.id)}
                        disabled={pending}
                      >
                        Send now
                      </button>
                    ) : (
                      "—"
                    )}
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
