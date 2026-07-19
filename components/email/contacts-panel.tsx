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
import type { EmailContact } from "@/lib/email-engine/types";

export function EmailContactsPanel({
  contacts,
  canManage,
}: {
  contacts: EmailContact[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  async function createContact(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/email/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || null }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create.");
      setEmail("");
      setName("");
      setSuccess("Contact saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create.");
    } finally {
      setPending(false);
    }
  }

  async function syncCrm() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/email/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_crm" }),
      });
      const data = (await response.json()) as {
        error?: string;
        synced?: number;
      };
      if (!response.ok) throw new Error(data.error || "CRM sync failed.");
      setSuccess(`Synced ${data.synced ?? 0} contacts to CRM.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CRM sync failed.");
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
            Email recipients with optional CRM contact and lead linking.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            onClick={syncCrm}
            disabled={pending}
          >
            {pending ? "Syncing…" : "Sync all to CRM"}
          </button>
        ) : null}
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={createContact}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-3"
      >
        <div>
          <label className={authLabelClassName}>Email</label>
          <input
            className={authInputClassName}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Name</label>
          <input
            className={authInputClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            Add contact
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">CRM</th>
              <th className="px-4 py-3 font-medium">Last email</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  No email contacts yet.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {contact.email}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {contact.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{contact.status}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {contact.crmContactId ? "Linked" : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {contact.lastEmailAt
                      ? new Date(contact.lastEmailAt).toLocaleString()
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
