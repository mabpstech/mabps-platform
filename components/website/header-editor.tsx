"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import { LivePreview } from "@/components/website/live-preview";
import { MediaPicker } from "@/components/website/media-picker";
import { SaveBar, type SaveState } from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
import type { WebsiteHeader } from "@/lib/website/types";

type LogoSize = "sm" | "md" | "lg";

function readLogoSize(header: WebsiteHeader): LogoSize {
  const anyHeader = header as WebsiteHeader & { logoSize?: string | null };
  if (anyHeader.logoSize === "sm" || anyHeader.logoSize === "lg") {
    return anyHeader.logoSize;
  }
  return "md";
}

export function HeaderEditor({
  siteId,
  siteSlug,
  header,
  canManage,
}: {
  siteId: string;
  siteSlug: string;
  header: WebsiteHeader;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(header);
  const [logoSize, setLogoSize] = useState<LogoSize>(() => readLogoSize(header));
  const [announcement, setAnnouncement] = useState(
    () =>
      (header as WebsiteHeader & { announcementText?: string | null })
        .announcementText ?? "",
  );
  const [showAnnouncement, setShowAnnouncement] = useState(
    () =>
      Boolean(
        (header as WebsiteHeader & { announcementEnabled?: boolean })
          .announcementEnabled,
      ),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [previewToken, setPreviewToken] = useState(0);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    setSaveState((current) => (current === "saving" ? current : "dirty"));
  }, [form, logoSize, announcement, showAnnouncement]);

  async function save() {
    if (!canManage) return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/website/sites/${siteId}/header`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          logoSize,
          announcementText: announcement || null,
          announcementEnabled: showAnnouncement,
          // Search/cart are not shipped yet — keep them off in production chrome.
          showSearch: false,
          showCart: false,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        header?: WebsiteHeader;
      };
      if (!response.ok) throw new Error(data.error || "Unable to save header.");
      if (data.header) {
        setForm(data.header);
        setLogoSize(readLogoSize(data.header));
      }
      setSaveState("saved");
      setToast({ message: "Header saved ✓", tone: "success" });
      setPreviewToken((current) => current + 1);
      router.refresh();
      window.setTimeout(() => {
        setSaveState((current) => (current === "saved" ? "idle" : current));
      }, 1600);
    } catch (err) {
      setSaveState("error");
      setToast({
        message: err instanceof Error ? err.message : "Unable to save header.",
        tone: "error",
      });
    }
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <SaveBar state={saveState} onSave={() => void save()} label="Save header" />
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Header
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Logo, navigation bar, announcement, and call-to-action button.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Logo</h2>
          <MediaPicker
            siteId={siteId}
            value={form.logoMediaId}
            onChange={(logoMediaId) =>
              setForm((current) => ({ ...current, logoMediaId }))
            }
            disabled={!canManage}
            label="Logo image"
            hint="logo"
          />
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
              disabled={!canManage}
              placeholder="Shown when no logo image is set"
            />
          </div>
          <div>
            <label className={authLabelClassName}>Logo size</label>
            <select
              className={authInputClassName}
              value={logoSize}
              onChange={(event) => setLogoSize(event.target.value as LogoSize)}
              disabled={!canManage}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
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
              disabled={!canManage}
            />
            Show logo
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Bar & menu</h2>
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
              disabled={!canManage}
            />
            Sticky header (stays visible while scrolling)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={showAnnouncement}
              onChange={(event) => setShowAnnouncement(event.target.checked)}
              disabled={!canManage}
            />
            Announcement bar
          </label>
          {showAnnouncement ? (
            <div>
              <label className={authLabelClassName}>Announcement text</label>
              <input
                className={authInputClassName}
                value={announcement}
                onChange={(event) => setAnnouncement(event.target.value)}
                disabled={!canManage}
                placeholder="Free shipping this week"
              />
            </div>
          ) : null}
          <p className="text-xs text-zinc-500">
            Desktop and mobile menus are managed under Menu. Social icons live in
            Footer.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900">
            Call-to-action button
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={authLabelClassName}>Button text</label>
              <input
                className={authInputClassName}
                value={form.ctaLabel ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ctaLabel: event.target.value || null,
                  }))
                }
                disabled={!canManage}
                placeholder="Get started"
              />
            </div>
            <div>
              <label className={authLabelClassName}>Button link</label>
              <input
                className={authInputClassName}
                value={form.ctaHref ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ctaHref: event.target.value || null,
                  }))
                }
                disabled={!canManage}
                placeholder="/contact"
              />
            </div>
            <div>
              <label className={authLabelClassName}>Button style</label>
              <select
                className={authInputClassName}
                value={form.ctaStyle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ctaStyle: event.target
                      .value as WebsiteHeader["ctaStyle"],
                  }))
                }
                disabled={!canManage}
              >
                <option value="primary">Filled</option>
                <option value="secondary">Soft</option>
                <option value="outline">Outline</option>
              </select>
            </div>
            <div>
              <label className={authLabelClassName}>Header background</label>
              <input
                type="color"
                className="h-10 w-full rounded-md border border-zinc-300"
                value={form.backgroundColor || "#ffffff"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    backgroundColor: event.target.value,
                  }))
                }
                disabled={!canManage}
              />
            </div>
            <div>
              <label className={authLabelClassName}>Header text color</label>
              <input
                type="color"
                className="h-10 w-full rounded-md border border-zinc-300"
                value={form.textColor || "#18181b"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    textColor: event.target.value,
                  }))
                }
                disabled={!canManage}
              />
            </div>
          </div>
        </section>
      </div>

      <LivePreview
        src={`/p/${siteSlug}?preview=1`}
        title="Header preview"
        refreshToken={previewToken}
      />

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
