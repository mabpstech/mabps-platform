"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { LivePreview } from "@/components/website/live-preview";
import { SaveBar, type SaveState } from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
import type {
  FooterColumn,
  FooterSocialLink,
  WebsiteFooter,
} from "@/lib/website/types";

const SOCIAL_PRESETS = [
  { label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { label: "X", placeholder: "https://x.com/yourhandle" },
  { label: "LinkedIn", placeholder: "https://linkedin.com/company/yourbrand" },
  { label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { label: "TikTok", placeholder: "https://tiktok.com/@yourhandle" },
  { label: "WhatsApp", placeholder: "https://wa.me/15551234567" },
] as const;

function isValidSocialHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return trimmed.startsWith("mailto:") || trimmed.startsWith("tel:");
}

export function FooterEditor({
  siteId,
  siteSlug,
  footer,
  canManage,
}: {
  siteId: string;
  siteSlug: string;
  footer: WebsiteFooter;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(footer);
  const [socialLinks, setSocialLinks] = useState<FooterSocialLink[]>(
    footer.socialLinks,
  );
  const [columns, setColumns] = useState<FooterColumn[]>(footer.columns);
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
  }, [form, socialLinks, columns]);

  async function save() {
    if (!canManage) return;
    const invalid = socialLinks.find(
      (link) => link.href.trim() && !isValidSocialHref(link.href),
    );
    if (invalid) {
      setSaveState("error");
      setToast({
        message: `Social link “${invalid.label || "Untitled"}” needs a valid http(s), mailto, or tel URL.`,
        tone: "error",
      });
      return;
    }

    setSaveState("saving");
    try {
      const response = await fetch(`/api/website/sites/${siteId}/footer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          socialLinks: socialLinks.filter((link) => link.href.trim()),
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
        setSocialLinks(data.footer.socialLinks);
        setColumns(data.footer.columns);
      }
      setSaveState("saved");
      setToast({ message: "Footer saved ✓", tone: "success" });
      setPreviewToken((current) => current + 1);
      router.refresh();
      window.setTimeout(() => {
        setSaveState((current) => (current === "saved" ? "idle" : current));
      }, 1600);
    } catch (err) {
      setSaveState("error");
      setToast({
        message: err instanceof Error ? err.message : "Unable to save footer.",
        tone: "error",
      });
    }
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <SaveBar state={saveState} onSave={() => void save()} label="Save footer" />
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Footer
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Copyright, social links, and helpful link columns.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
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
            disabled={!canManage}
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
            disabled={!canManage}
          />
          Show social icons
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Social links</h2>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  onClick={() =>
                    setSocialLinks((current) => {
                      if (current.some((link) => link.label === preset.label)) {
                        return current;
                      }
                      return [
                        ...current,
                        { label: preset.label, href: "" },
                      ];
                    })
                  }
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {socialLinks.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No social links yet. Pick a platform above to add one.
          </p>
        ) : (
          socialLinks.map((link, index) => {
            const preset = SOCIAL_PRESETS.find(
              (item) => item.label === link.label,
            );
            const invalid = Boolean(link.href.trim()) && !isValidSocialHref(link.href);
            return (
              <div key={index} className="space-y-1">
                <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                  <select
                    className={authInputClassName}
                    value={
                      SOCIAL_PRESETS.some((item) => item.label === link.label)
                        ? link.label
                        : "Custom"
                    }
                    disabled={!canManage}
                    onChange={(event) => {
                      const nextLabel = event.target.value;
                      const next = [...socialLinks];
                      next[index] = {
                        ...next[index],
                        label: nextLabel === "Custom" ? "Website" : nextLabel,
                      };
                      setSocialLinks(next);
                    }}
                  >
                    {SOCIAL_PRESETS.map((item) => (
                      <option key={item.label} value={item.label}>
                        {item.label}
                      </option>
                    ))}
                    <option value="Custom">Custom</option>
                  </select>
                  <input
                    className={authInputClassName}
                    value={link.href}
                    disabled={!canManage}
                    placeholder={preset?.placeholder ?? "https://"}
                    onChange={(event) => {
                      const next = [...socialLinks];
                      next[index] = { ...next[index], href: event.target.value };
                      setSocialLinks(next);
                    }}
                  />
                  {canManage ? (
                    <button
                      type="button"
                      className={`${authSecondaryButtonClassName} !w-auto px-3 text-red-700`}
                      onClick={() =>
                        setSocialLinks((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                {invalid ? (
                  <p className="text-xs text-red-600">
                    Use a full URL starting with https://
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Link columns</h2>
          {canManage ? (
            <button
              type="button"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
              onClick={() =>
                setColumns((current) => [
                  ...current,
                  {
                    title: "Company",
                    links: [{ label: "About", href: "/about" }],
                  },
                ])
              }
            >
              Add column
            </button>
          ) : null}
        </div>
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className="space-y-3 rounded-xl border border-zinc-200 p-4"
          >
            <div className="flex items-center gap-2">
              <input
                className={authInputClassName}
                value={column.title}
                disabled={!canManage}
                placeholder="Column title"
                onChange={(event) => {
                  const next = [...columns];
                  next[columnIndex] = {
                    ...next[columnIndex],
                    title: event.target.value,
                  };
                  setColumns(next);
                }}
              />
              {canManage ? (
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() =>
                    setColumns((current) =>
                      current.filter((_, i) => i !== columnIndex),
                    )
                  }
                >
                  Remove column
                </button>
              ) : null}
            </div>
            {column.links.map((link, linkIndex) => (
              <div
                key={linkIndex}
                className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
              >
                <input
                  className={authInputClassName}
                  value={link.label}
                  disabled={!canManage}
                  placeholder="Link label"
                  onChange={(event) => {
                    const next = [...columns];
                    const links = [...next[columnIndex].links];
                    links[linkIndex] = {
                      ...links[linkIndex],
                      label: event.target.value,
                    };
                    next[columnIndex] = { ...next[columnIndex], links };
                    setColumns(next);
                  }}
                />
                <input
                  className={authInputClassName}
                  value={link.href}
                  disabled={!canManage}
                  placeholder="/page"
                  onChange={(event) => {
                    const next = [...columns];
                    const links = [...next[columnIndex].links];
                    links[linkIndex] = {
                      ...links[linkIndex],
                      href: event.target.value,
                    };
                    next[columnIndex] = { ...next[columnIndex], links };
                    setColumns(next);
                  }}
                />
                {canManage ? (
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => {
                      const next = [...columns];
                      next[columnIndex] = {
                        ...next[columnIndex],
                        links: next[columnIndex].links.filter(
                          (_, i) => i !== linkIndex,
                        ),
                      };
                      setColumns(next);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
            {canManage ? (
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                onClick={() => {
                  const next = [...columns];
                  next[columnIndex] = {
                    ...next[columnIndex],
                    links: [
                      ...next[columnIndex].links,
                      { label: "New link", href: "/" },
                    ],
                  };
                  setColumns(next);
                }}
              >
                Add link
              </button>
            ) : null}
          </div>
        ))}
      </section>

      <LivePreview
        src={`/p/${siteSlug}?preview=1`}
        title="Footer preview"
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
