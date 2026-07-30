"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import { MediaPicker } from "@/components/website/media-picker";
import {
  editorFetchJson,
  useEditorPersistence,
} from "@/components/website/hooks/use-editor-persistence";
import { SaveBar } from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
import type { WebsiteSeo, WebsiteTheme } from "@/lib/website/types";

export function SeoEditor({
  siteId,
  siteSlug,
  siteName,
  seo,
  faviconMediaId,
  canManage,
}: {
  siteId: string;
  siteSlug: string;
  siteName: string;
  seo: WebsiteSeo;
  faviconMediaId: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(seo);
  const [faviconId, setFaviconId] = useState<string | null>(faviconMediaId);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(seo.jsonLd));
  const [seoRevision, setSeoRevision] = useState(seo.updatedAt);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const skipDirty = useRef(false);
  const formRef = useRef(form);
  const faviconIdRef = useRef(faviconId);
  formRef.current = form;
  faviconIdRef.current = faviconId;

  useEffect(() => {
    skipDirty.current = true;
    setForm(seo);
    setFaviconId(faviconMediaId);
    setSeoRevision(seo.updatedAt);
  }, [seo, faviconMediaId]);

  const { saveState, saveNow } = useEditorPersistence<{
    seo?: WebsiteSeo;
    theme?: WebsiteTheme;
  }>({
    enabled: canManage,
    resourceKey: `seo:${siteId}`,
    revision: seoRevision,
    onRevisionChange: setSeoRevision,
    skipNextDirtyRef: skipDirty,
    deps: [form, faviconId],
    onRemoteUpdate: () => router.refresh(),
    onError: (error) => setToast({ message: error.message, tone: "error" }),
    onSaved: (result, { silent, editedDuringSave }) => {
      if (result.data?.seo && !editedDuringSave) {
        skipDirty.current = true;
        setForm(result.data.seo);
      }
      if (!silent) {
        setToast({ message: "Search settings saved", tone: "success" });
        router.refresh();
      }
    },
    save: async ({ expectedUpdatedAt, signal }) => {
      // Favicon lives on theme; SEO revision gates the primary document.
      // Theme writes are last-known-wins for favicon-only changes in this editor.
      const [seoData, themeData] = await Promise.all([
        editorFetchJson<{ seo?: WebsiteSeo }>(
          `/api/website/sites/${siteId}/seo`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            signal,
            body: JSON.stringify({
              ...formRef.current,
              expectedUpdatedAt,
            }),
          },
        ),
        editorFetchJson<{ theme?: WebsiteTheme }>(
          `/api/website/sites/${siteId}/theme`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            signal,
            body: JSON.stringify({
              faviconMediaId: faviconIdRef.current,
            }),
          },
        ),
      ]);
      if (!seoData.seo?.updatedAt) throw new Error("Unable to save SEO.");
      return {
        updatedAt: seoData.seo.updatedAt,
        data: { seo: seoData.seo, theme: themeData.theme },
      };
    },
  });

  const previewTitle =
    form.defaultTitle?.trim() || `${siteName} | Website`;
  const previewDescription =
    form.defaultDescription?.trim() ||
    "Add a short description so people understand your offer in search results.";
  const previewUrl =
    form.canonicalBaseUrl?.replace(/^https?:\/\//, "") ||
    `your-app.com/p/${siteSlug}`;

  return (
    <div className="space-y-4">
      {canManage ? (
        <SaveBar
          state={saveState}
          onSave={() => void saveNow({ silent: false })}
          onReload={() => router.refresh()}
          label="Save search settings"
        />
      ) : null}

      <div className="min-w-0 max-w-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Grow
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          Search & SEO
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          Help customers find your website on Google and social media.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
          <div className="sm:col-span-2">
            <MediaPicker
              siteId={siteId}
              value={faviconId}
              onChange={setFaviconId}
              disabled={!canManage}
              label="Favicon"
              hint="favicon"
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
            <p className="mt-1.5 text-xs text-zinc-500">
              Used for canonical links, Open Graph URLs, sitemap, and robots.txt.
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Google preview
            </p>
            <div className="mt-3 space-y-1">
              <p className="truncate text-xs text-emerald-800">{previewUrl}</p>
              <p className="line-clamp-2 text-lg font-medium text-[#1a0dab]">
                {previewTitle}
              </p>
              <p className="line-clamp-3 text-sm text-zinc-600">
                {previewDescription}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Social card
            </p>
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
              {form.ogImageMediaId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/website/media/file/${form.ogImageMediaId}`}
                  alt=""
                  className="h-28 w-full object-cover"
                />
              ) : (
                <div className="flex h-28 items-center justify-center bg-zinc-50 text-xs text-zinc-400">
                  No social image yet
                </div>
              )}
              <div className="space-y-1 px-3 py-3">
                <p className="truncate text-[11px] uppercase tracking-wide text-zinc-400">
                  {previewUrl}
                </p>
                <p className="line-clamp-2 text-sm font-semibold text-zinc-900">
                  {previewTitle}
                </p>
                <p className="line-clamp-2 text-xs text-zinc-500">
                  {previewDescription}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="font-medium text-zinc-900">Public SEO files</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>
                Sitemap:{" "}
                <a
                  className="font-medium text-zinc-900 underline underline-offset-2"
                  href={`/p/${siteSlug}/sitemap.xml`}
                  target="_blank"
                  rel="noreferrer"
                >
                  /p/{siteSlug}/sitemap.xml
                </a>
              </li>
              <li>
                Robots:{" "}
                <a
                  className="font-medium text-zinc-900 underline underline-offset-2"
                  href={`/p/${siteSlug}/robots.txt`}
                  target="_blank"
                  rel="noreferrer"
                >
                  /p/{siteSlug}/robots.txt
                </a>
              </li>
            </ul>
          </div>
        </aside>
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
