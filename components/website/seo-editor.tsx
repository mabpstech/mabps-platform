"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import { MediaPicker } from "@/components/website/media-picker";
import { SaveBar, type SaveState } from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
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
  const [showAdvanced, setShowAdvanced] = useState(Boolean(seo.jsonLd));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    setSaveState((current) => (current === "saving" ? current : "dirty"));
  }, [form]);

  async function save() {
    if (!canManage) return;
    setSaveState("saving");
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
      setSaveState("saved");
      setToast({ message: "Search settings saved ✓", tone: "success" });
      router.refresh();
      window.setTimeout(() => {
        setSaveState((current) => (current === "saved" ? "idle" : current));
      }, 1600);
    } catch (err) {
      setSaveState("error");
      setToast({
        message: err instanceof Error ? err.message : "Unable to save SEO.",
        tone: "error",
      });
    }
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <SaveBar
          state={saveState}
          onSave={() => void save()}
          label="Save search settings"
        />
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Search & SEO
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Help customers find your website on Google and social media.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Default page title</label>
          <input
            className={authInputClassName}
            value={form.defaultTitle ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                defaultTitle: event.target.value || null,
              }))
            }
            disabled={!canManage}
            placeholder="Your Business | Tagline"
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
            disabled={!canManage}
            placeholder="A short summary of what you offer"
          />
        </div>
        <div className="sm:col-span-2">
          <MediaPicker
            siteId={siteId}
            value={form.ogImageMediaId}
            onChange={(ogImageMediaId) =>
              setForm((current) => ({ ...current, ogImageMediaId }))
            }
            disabled={!canManage}
            label="Social share image"
            hint="og"
          />
        </div>
        <div>
          <label className={authLabelClassName}>X / Twitter handle</label>
          <input
            className={authInputClassName}
            value={form.twitterHandle ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                twitterHandle: event.target.value || null,
              }))
            }
            disabled={!canManage}
            placeholder="@yourbrand"
          />
        </div>
        <div>
          <label className={authLabelClassName}>Search engine visibility</label>
          <select
            className={authInputClassName}
            value={form.robots}
            onChange={(event) =>
              setForm((current) => ({ ...current, robots: event.target.value }))
            }
            disabled={!canManage}
          >
            <option value="index,follow">Show in search results</option>
            <option value="noindex,nofollow">Hide from search results</option>
            <option value="index,nofollow">Show, but don’t follow links</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Preferred website URL</label>
          <input
            className={authInputClassName}
            value={form.canonicalBaseUrl ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                canonicalBaseUrl: event.target.value || null,
              }))
            }
            disabled={!canManage}
            placeholder="https://www.yourdomain.com"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <button
          type="button"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          onClick={() => setShowAdvanced((value) => !value)}
        >
          {showAdvanced ? "Hide advanced options" : "Show advanced options"}
        </button>
        {showAdvanced ? (
          <div className="mt-4">
            <label className={authLabelClassName}>
              Structured data (optional)
            </label>
            <textarea
              className={`${authInputClassName} min-h-32 font-mono text-xs`}
              value={form.jsonLd ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  jsonLd: event.target.value || null,
                }))
              }
              disabled={!canManage}
              placeholder="Paste JSON-LD only if your SEO specialist provided it"
            />
          </div>
        ) : null}
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
