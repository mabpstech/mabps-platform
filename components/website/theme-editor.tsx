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
import type { WebsiteTheme } from "@/lib/website/types";

const FONT_PRESETS = [
  {
    id: "classic",
    label: "Classic",
    heading: "Georgia, 'Times New Roman', serif",
    body: "ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "modern",
    label: "Modern Sans",
    heading: "ui-sans-serif, system-ui, sans-serif",
    body: "ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "editorial",
    label: "Editorial",
    heading: "Georgia, Cambria, serif",
    body: "Georgia, Cambria, serif",
  },
] as const;

const RADIUS_PRESETS = [
  { id: "0", label: "Sharp", value: "0px" },
  { id: "0.375rem", label: "Soft", value: "0.375rem" },
  { id: "0.5rem", label: "Rounded", value: "0.5rem" },
  { id: "1rem", label: "Pill-friendly", value: "1rem" },
] as const;

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
  const [showAdvanced, setShowAdvanced] = useState(Boolean(theme.customCss));
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

  function setField<K extends keyof WebsiteTheme>(key: K, value: WebsiteTheme[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!canManage) return;
    setSaveState("saving");
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
      setSaveState("saved");
      setToast({ message: "Theme saved ✓", tone: "success" });
      router.refresh();
      window.setTimeout(() => {
        setSaveState((current) => (current === "saved" ? "idle" : current));
      }, 1600);
    } catch (err) {
      setSaveState("error");
      setToast({
        message: err instanceof Error ? err.message : "Unable to save theme.",
        tone: "error",
      });
    }
  }

  const colorFields = [
    ["primaryColor", "Primary", "Buttons and key accents"],
    ["secondaryColor", "Secondary", "Supporting surfaces"],
    ["backgroundColor", "Background", "Page background"],
    ["textColor", "Text", "Main text color"],
    ["mutedColor", "Muted text", "Supporting copy"],
  ] as const;

  return (
    <div className="space-y-4">
      {canManage ? (
        <SaveBar state={saveState} onSave={() => void save()} label="Save theme" />
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Theme
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Colors, type, buttons, and brand assets for your website.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-zinc-900">Colors</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {colorFields.map(([key, label, help]) => (
                <div key={key}>
                  <label className={authLabelClassName}>{label}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form[key]}
                      onChange={(event) => setField(key, event.target.value)}
                      disabled={!canManage}
                      className="h-10 w-12 rounded border border-zinc-300"
                    />
                    <input
                      className={authInputClassName}
                      value={form[key]}
                      onChange={(event) => setField(key, event.target.value)}
                      disabled={!canManage}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{help}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-zinc-900">Typography</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {FONT_PRESETS.map((preset) => {
                const active =
                  form.fontHeading === preset.heading &&
                  form.fontBody === preset.body;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!canManage}
                    onClick={() => {
                      setField("fontHeading", preset.heading);
                      setField("fontBody", preset.body);
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-zinc-900 ring-1 ring-zinc-900"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{ fontFamily: preset.heading }}
                    >
                      {preset.label}
                    </p>
                    <p
                      className="mt-1 text-xs text-zinc-500"
                      style={{ fontFamily: preset.body }}
                    >
                      Aa Bb Cc
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
            <div>
              <label className={authLabelClassName}>Corner style</label>
              <select
                className={authInputClassName}
                value={form.borderRadius}
                onChange={(event) => setField("borderRadius", event.target.value)}
                disabled={!canManage}
              >
                {RADIUS_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
                {!RADIUS_PRESETS.some((p) => p.value === form.borderRadius) ? (
                  <option value={form.borderRadius}>Custom</option>
                ) : null}
              </select>
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
                disabled={!canManage}
              >
                <option value="primary">Filled</option>
                <option value="secondary">Soft</option>
                <option value="outline">Outline</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs text-zinc-500">
                Container width stays comfortable for reading on all devices.
              </p>
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
            <MediaPicker
              siteId={siteId}
              value={form.logoMediaId}
              onChange={(logoMediaId) => setField("logoMediaId", logoMediaId)}
              disabled={!canManage}
              label="Brand logo"
              hint="logo"
            />
            <MediaPicker
              siteId={siteId}
              value={form.faviconMediaId}
              onChange={(faviconMediaId) =>
                setField("faviconMediaId", faviconMediaId)
              }
              disabled={!canManage}
              label="Browser icon"
              hint="favicon"
            />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <button
              type="button"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {showAdvanced ? "Hide advanced CSS" : "Show advanced CSS"}
            </button>
            {showAdvanced ? (
              <div className="mt-3">
                <label className={authLabelClassName}>Custom CSS</label>
                <textarea
                  className={`${authInputClassName} min-h-32 font-mono text-xs`}
                  value={form.customCss ?? ""}
                  onChange={(event) =>
                    setField("customCss", event.target.value || null)
                  }
                  disabled={!canManage}
                  placeholder="Optional — for advanced styling only"
                />
              </div>
            ) : null}
          </section>
        </div>

        <div
          className="h-fit rounded-2xl border border-zinc-200 p-6 shadow-sm"
          style={{
            background: form.backgroundColor,
            color: form.textColor,
            fontFamily: form.fontBody,
            borderRadius: form.borderRadius,
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">
            Live preview
          </p>
          <h3
            className="mt-3 text-2xl font-semibold"
            style={{ fontFamily: form.fontHeading, color: form.primaryColor }}
          >
            Your brand look
          </h3>
          <p style={{ color: form.mutedColor }} className="mt-2 text-sm leading-relaxed">
            Buttons, headings, and body text follow these theme choices across
            your website.
          </p>
          <button
            type="button"
            className="mt-5 px-4 py-2 text-sm font-medium"
            style={{
              background:
                form.buttonStyle === "outline"
                  ? "transparent"
                  : form.buttonStyle === "secondary"
                    ? form.secondaryColor
                    : form.primaryColor,
              color:
                form.buttonStyle === "outline" ? form.primaryColor : "#fff",
              border: `1px solid ${form.primaryColor}`,
              borderRadius: form.borderRadius,
            }}
          >
            Sample button
          </button>
          <div
            className="mt-6 rounded-xl border p-4"
            style={{
              borderColor: "rgba(0,0,0,0.08)",
              borderRadius: form.borderRadius,
            }}
          >
            <p className="text-sm font-medium">Card surface</p>
            <p className="mt-1 text-xs" style={{ color: form.mutedColor }}>
              Ready for light and dark brand directions.
            </p>
          </div>
        </div>
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
