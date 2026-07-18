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
import type { WebsiteHeader } from "@/lib/website/types";

export function HeaderEditor({
  siteId,
  header,
  canManage,
}: {
  siteId: string;
  header: WebsiteHeader;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(header);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/website/sites/${siteId}/header`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        error?: string;
        header?: WebsiteHeader;
      };
      if (!response.ok) throw new Error(data.error || "Unable to save header.");
      if (data.header) setForm(data.header);
      setMessage("Header saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save header.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Header</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Logo, sticky behavior, and header call-to-action.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save header"}
          </button>
        ) : null}
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
        <div>
          <label className={authLabelClassName}>Logo text</label>
          <input
            className={authInputClassName}
            value={form.logoText ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                logoText: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Logo media ID</label>
          <input
            className={authInputClassName}
            value={form.logoMediaId ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                logoMediaId: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>CTA label</label>
          <input
            className={authInputClassName}
            value={form.ctaLabel ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                ctaLabel: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>CTA href</label>
          <input
            className={authInputClassName}
            value={form.ctaHref ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                ctaHref: event.target.value || null,
              }))
            }
            disabled={!canManage || pending}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={form.showLogo}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                showLogo: event.target.checked,
              }))
            }
            disabled={!canManage || pending}
          />
          Show logo
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={form.sticky}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sticky: event.target.checked,
              }))
            }
            disabled={!canManage || pending}
          />
          Sticky header
        </label>
      </div>
    </div>
  );
}
