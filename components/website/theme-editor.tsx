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
import type { WebsiteTheme } from "@/lib/website/types";

export function ThemeEditor({
  siteId,
  theme,
  canManage,
}: {
  siteId: string;
  theme: WebsiteTheme;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(theme);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function setField<K extends keyof WebsiteTheme>(key: K, value: WebsiteTheme[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/website/sites/${siteId}/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        error?: string;
        theme?: WebsiteTheme;
      };
      if (!response.ok) throw new Error(data.error || "Unable to save theme.");
      if (data.theme) setForm(data.theme);
      setMessage("Theme saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save theme.");
    } finally {
      setPending(false);
    }
  }

  const colorFields = [
    ["primaryColor", "Primary"],
    ["secondaryColor", "Secondary"],
    ["backgroundColor", "Background"],
    ["textColor", "Text"],
    ["mutedColor", "Muted"],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Theme</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Colors, typography, and button style for the published site.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save theme"}
          </button>
        ) : null}
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
        {colorFields.map(([key, label]) => (
          <div key={key}>
            <label className={authLabelClassName}>{label}</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form[key]}
                onChange={(event) => setField(key, event.target.value)}
                disabled={!canManage || pending}
                className="h-10 w-12 rounded border border-zinc-300"
              />
              <input
                className={authInputClassName}
                value={form[key]}
                onChange={(event) => setField(key, event.target.value)}
                disabled={!canManage || pending}
              />
            </div>
          </div>
        ))}
        <div>
          <label className={authLabelClassName}>Heading font</label>
          <input
            className={authInputClassName}
            value={form.fontHeading}
            onChange={(event) => setField("fontHeading", event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Body font</label>
          <input
            className={authInputClassName}
            value={form.fontBody}
            onChange={(event) => setField("fontBody", event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Border radius</label>
          <input
            className={authInputClassName}
            value={form.borderRadius}
            onChange={(event) => setField("borderRadius", event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Button style</label>
          <select
            className={authInputClassName}
            value={form.buttonStyle}
            onChange={(event) =>
              setField(
                "buttonStyle",
                event.target.value as WebsiteTheme["buttonStyle"],
              )
            }
            disabled={!canManage || pending}
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="outline">Outline</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Custom CSS</label>
          <textarea
            className={`${authInputClassName} min-h-32 font-mono text-xs`}
            value={form.customCss ?? ""}
            onChange={(event) =>
              setField("customCss", event.target.value || null)
            }
            disabled={!canManage || pending}
          />
        </div>
      </div>

      <div
        className="rounded-xl border border-zinc-200 p-6"
        style={{
          background: form.backgroundColor,
          color: form.textColor,
          fontFamily: form.fontBody,
          borderRadius: form.borderRadius,
        }}
      >
        <h3 style={{ fontFamily: form.fontHeading, color: form.primaryColor }}>
          Theme preview
        </h3>
        <p style={{ color: form.mutedColor }} className="mt-2 text-sm">
          Buttons and body copy follow your theme tokens.
        </p>
        <button
          type="button"
          className="mt-4 px-4 py-2 text-sm"
          style={{
            background:
              form.buttonStyle === "outline" ? "transparent" : form.primaryColor,
            color:
              form.buttonStyle === "outline" ? form.primaryColor : "#fff",
            border: `1px solid ${form.primaryColor}`,
            borderRadius: form.borderRadius,
          }}
        >
          Sample button
        </button>
      </div>
    </div>
  );
}
