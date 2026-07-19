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
import type { WhatsAppTemplate } from "@/lib/whatsapp/types";

export function TemplatesPanel({
  templates,
  canManage,
}: {
  templates: WhatsAppTemplate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [body, setBody] = useState("");

  async function syncFromMeta() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = (await response.json()) as {
        error?: string;
        synced?: number;
      };
      if (!response.ok) throw new Error(data.error || "Sync failed.");
      setSuccess(`Synced ${data.synced ?? 0} templates from Meta.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setPending(false);
    }
  }

  async function createLocal(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, language, body, status: "LOCAL" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create.");
      setName("");
      setBody("");
      setSuccess("Local template saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Templates</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Message templates synced from your WABA, plus local draft copies.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            onClick={syncFromMeta}
            disabled={pending}
          >
            {pending ? "Syncing…" : "Sync from Meta"}
          </button>
        ) : null}
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {canManage ? (
        <form
          onSubmit={createLocal}
          className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
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
            <label className={authLabelClassName}>Language</label>
            <input
              className={authInputClassName}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={authLabelClassName}>Body</label>
            <textarea
              className={authInputClassName}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <button
              type="submit"
              className={`${authButtonClassName} !w-auto px-4`}
              disabled={pending}
            >
              Save local template
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Body</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  No templates yet.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="border-b border-zinc-100 align-top">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {template.name}
                  </td>
                  <td className="px-4 py-3">{template.language}</td>
                  <td className="px-4 py-3">{template.status}</td>
                  <td className="px-4 py-3">{template.category || "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {template.body || "—"}
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
