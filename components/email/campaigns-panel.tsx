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
import type { EmailCampaign, EmailTemplate } from "@/lib/email-engine/types";

export function EmailCampaignsPanel({
  campaigns,
  templates,
  canManage,
}: {
  campaigns: EmailCampaign[];
  templates: EmailTemplate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [html, setHtml] = useState(
    "<p>Hi {{name}},</p><p>Here is our latest update.</p>",
  );

  async function createCampaign(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          templateId: templateId || null,
          html,
          allContacts: true,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create.");
      setName("");
      setSubject("");
      setSuccess("Campaign created with all subscribed contacts.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create.");
    } finally {
      setPending(false);
    }
  }

  async function sendCampaign(campaignId: string) {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/email/campaigns/${campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to send.");
      setSuccess("Campaign send completed.");
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
        <h1 className="text-2xl font-semibold text-zinc-900">Campaigns</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Marketing email campaigns to subscribed contacts with open, click, and
          bounce analytics.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {canManage ? (
        <form
          onSubmit={createCampaign}
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
            <label className={authLabelClassName}>Template (optional)</label>
            <select
              className={authInputClassName}
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={pending}
            >
              <option value="">None</option>
              {templates
                .filter((template) => template.category === "marketing")
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
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
              Create campaign (all subscribed contacts)
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Sent / Failed</th>
              <th className="px-4 py-3 font-medium">Open / Click / Bounce</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={7}>
                  No campaigns yet.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {campaign.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{campaign.subject}</td>
                  <td className="px-4 py-3 text-zinc-600">{campaign.status}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {campaign.totalRecipients}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {campaign.sentCount} / {campaign.failedCount}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {campaign.openCount} / {campaign.clickCount} /{" "}
                    {campaign.bounceCount}
                  </td>
                  <td className="px-4 py-3">
                    {canManage &&
                    (campaign.status === "draft" ||
                      campaign.status === "scheduled" ||
                      campaign.status === "failed") ? (
                      <button
                        type="button"
                        className="text-sm font-medium text-zinc-900 hover:underline"
                        disabled={pending}
                        onClick={() => sendCampaign(campaign.id)}
                      >
                        Send
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
