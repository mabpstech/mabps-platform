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
import type { WebsiteFooter } from "@/lib/website/types";

export function FooterEditor({
  siteId,
  footer,
  canManage,
}: {
  siteId: string;
  footer: WebsiteFooter;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(footer);
  const [socialJson, setSocialJson] = useState(
    JSON.stringify(footer.socialLinks, null, 2),
  );
  const [columnsJson, setColumnsJson] = useState(
    JSON.stringify(footer.columns, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const socialLinks = JSON.parse(socialJson);
      const columns = JSON.parse(columnsJson);
      if (!Array.isArray(socialLinks) || !Array.isArray(columns)) {
        throw new Error("Social links and columns must be JSON arrays.");
      }

      const response = await fetch(`/api/website/sites/${siteId}/footer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          socialLinks,
          columns,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        footer?: WebsiteFooter;
      };
      if (!response.ok) throw new Error(data.error || "Unable to save footer.");
      if (data.footer) {
        setForm(data.footer);
        setSocialJson(JSON.stringify(data.footer.socialLinks, null, 2));
        setColumnsJson(JSON.stringify(data.footer.columns, null, 2));
      }
      setMessage("Footer saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save footer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Footer</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Copyright, social links, and footer columns.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save footer"}
          </button>
        ) : null}
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <label className={authLabelClassName}>Copyright text</label>
          <input
            className={authInputClassName}
            value={form.copyrightText ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                copyrightText: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={form.showSocial}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                showSocial: event.target.checked,
              }))
            }
            disabled={!canManage || pending}
          />
          Show social links
        </label>
        <div>
          <label className={authLabelClassName}>
            Social links JSON
          </label>
          <textarea
            className={`${authInputClassName} min-h-28 font-mono text-xs`}
            value={socialJson}
            onChange={(event) => setSocialJson(event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Columns JSON</label>
          <textarea
            className={`${authInputClassName} min-h-40 font-mono text-xs`}
            value={columnsJson}
            onChange={(event) => setColumnsJson(event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
      </div>
    </div>
  );
}
