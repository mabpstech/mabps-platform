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
import type { WebsiteSeo } from "@/lib/website/types";

export function SeoEditor({
  siteId,
  seo,
  canManage,
}: {
  siteId: string;
  seo: WebsiteSeo;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(seo);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/website/sites/${siteId}/seo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        error?: string;
        seo?: WebsiteSeo;
      };
      if (!response.ok) throw new Error(data.error || "Unable to save SEO.");
      if (data.seo) setForm(data.seo);
      setMessage("SEO settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save SEO.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">SEO settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Defaults for titles, descriptions, robots, and structured data.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save SEO"}
          </button>
        ) : null}
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Default title</label>
          <input
            className={authInputClassName}
            value={form.defaultTitle ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                defaultTitle: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Default description</label>
          <textarea
            className={`${authInputClassName} min-h-24`}
            value={form.defaultDescription ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                defaultDescription: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>OG image media ID</label>
          <input
            className={authInputClassName}
            value={form.ogImageMediaId ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                ogImageMediaId: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Twitter handle</label>
          <input
            className={authInputClassName}
            value={form.twitterHandle ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                twitterHandle: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Robots</label>
          <input
            className={authInputClassName}
            value={form.robots}
            onChange={(event) =>
              setForm((current) => ({ ...current, robots: event.target.value }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Canonical base URL</label>
          <input
            className={authInputClassName}
            value={form.canonicalBaseUrl ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                canonicalBaseUrl: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>JSON-LD</label>
          <textarea
            className={`${authInputClassName} min-h-32 font-mono text-xs`}
            value={form.jsonLd ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                jsonLd: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
      </div>
    </div>
  );
}
