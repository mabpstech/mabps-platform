"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { WhatsAppContact } from "@/lib/whatsapp/types";

export function ContactsPanel({
  contacts,
  canManage,
}: {
  contacts: WhatsAppContact[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function syncCrm() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/whatsapp/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_crm" }),
      });
      const data = (await response.json()) as {
        error?: string;
        synced?: number;
      };
      if (!response.ok) throw new Error(data.error || "Sync failed.");
      setSuccess(`Synced ${data.synced ?? 0} contacts to CRM.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            WhatsApp identities synced into CRM contacts and leads by phone.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            onClick={syncCrm}
            disabled={pending}
          >
            {pending ? "Syncing…" : "Sync to CRM"}
          </button>
        ) : null}
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">CRM contact</th>
              <th className="px-4 py-3 font-medium">CRM lead</th>
              <th className="px-4 py-3 font-medium">Last message</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  No WhatsApp contacts yet.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {contact.profileName || "—"}
                  </td>
                  <td className="px-4 py-3">+{contact.phone}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {contact.crmContactId || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {contact.crmLeadId || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {contact.lastMessageAt
                      ? new Date(contact.lastMessageAt).toLocaleString()
                      : "—"}
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
