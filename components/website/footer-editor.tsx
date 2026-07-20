"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { SaveBar, type SaveState } from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
import type {
  FooterColumn,
  FooterSocialLink,
  WebsiteFooter,
} from "@/lib/website/types";

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
  const [socialLinks, setSocialLinks] = useState<FooterSocialLink[]>(
    footer.socialLinks,
  );
  const [columns, setColumns] = useState<FooterColumn[]>(footer.columns);
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
  }, [form, socialLinks, columns]);

  async function save() {
    if (!canManage) return;
    setSaveState("saving");
    try {
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
        setSocialLinks(data.footer.socialLinks);
        setColumns(data.footer.columns);
      }
      setSaveState("saved");
      setToast({ message: "Footer saved ✓", tone: "success" });
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Social links</h2>
          {canManage ? (
            <button
              type="button"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
              onClick={() =>
                setSocialLinks((current) => [
                  ...current,
                  { label: "Instagram", href: "https://" },
                ])
              }
            >
              Add link
            </button>
          ) : null}
        </div>
        {socialLinks.length === 0 ? (
          <p className="text-sm text-zinc-500">No social links yet.</p>
        ) : (
          socialLinks.map((link, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <input
                className={authInputClassName}
                value={link.label}
                disabled={!canManage}
                placeholder="Platform"
                onChange={(event) => {
                  const next = [...socialLinks];
                  next[index] = { ...next[index], label: event.target.value };
                  setSocialLinks(next);
                }}
              />
              <input
                className={authInputClassName}
                value={link.href}
                disabled={!canManage}
                placeholder="https://"
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
          ))
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

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
