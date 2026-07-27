"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { slugifyName } from "@/components/website/ui/labels";
import {
  LEGACY_WIZARD_PRESET_MAP,
  getThemePreset,
} from "@/lib/website/theme";
import type { WebsiteSite } from "@/lib/website/types";

const CATEGORIES = [
  { id: "retail", label: "Retail & Shop", description: "Products and collections" },
  { id: "services", label: "Services", description: "Agencies, consultants, studios" },
  { id: "restaurant", label: "Food & Hospitality", description: "Menus, bookings, ambiance" },
  { id: "professional", label: "Professional", description: "Clinics, law, finance" },
  { id: "creator", label: "Creator / Portfolio", description: "Personal brand and work" },
  { id: "other", label: "Other", description: "Start with a clean slate" },
] as const;

const TEMPLATES = [
  {
    id: "classic",
    label: "Classic Business",
    description: "Clean hero, features, and contact",
  },
  {
    id: "showcase",
    label: "Showcase",
    description: "Bold hero focused on your brand story",
  },
  {
    id: "catalog",
    label: "Catalog",
    description: "Highlight products and collections first",
  },
] as const;

const THEMES = [
  {
    id: "ink",
    label: "Minimal White",
    primaryColor: "#18181b",
    secondaryColor: "#3f3f46",
    backgroundColor: "#ffffff",
    accent: "#18181b",
  },
  {
    id: "ocean",
    label: "Modern Blue",
    primaryColor: "#1d4ed8",
    secondaryColor: "#1e3a8a",
    backgroundColor: "#f8fafc",
    accent: "#38bdf8",
  },
  {
    id: "ember",
    label: "Restaurant Earth",
    primaryColor: "#9a3412",
    secondaryColor: "#7c2d12",
    backgroundColor: "#fffaf7",
    accent: "#ea580c",
  },
  {
    id: "forest",
    label: "Nature Green",
    primaryColor: "#166534",
    secondaryColor: "#14532d",
    backgroundColor: "#f7fbf8",
    accent: "#65a30d",
  },
] as const;

const STEPS = [
  { id: "name", label: "Name", title: "Name your website" },
  { id: "category", label: "Category", title: "Choose a category" },
  { id: "template", label: "Template", title: "Choose a template" },
  { id: "theme", label: "Theme", title: "Pick a theme" },
  { id: "review", label: "Review", title: "Review and create" },
] as const;

export function CreateSiteWizard({
  open,
  onClose,
  canManage,
}: {
  open: boolean;
  onClose: () => void;
  canManage: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]["id"]>("retail");
  const [template, setTemplate] =
    useState<(typeof TEMPLATES)[number]["id"]>("classic");
  const [themeId, setThemeId] = useState<(typeof THEMES)[number]["id"]>("ink");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTheme = useMemo(
    () => THEMES.find((theme) => theme.id === themeId) ?? THEMES[0],
    [themeId],
  );
  const selectedCategory = CATEGORIES.find((item) => item.id === category);
  const selectedTemplate = TEMPLATES.find((item) => item.id === template);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pending]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
    return () => previouslyFocused?.focus();
  }, [open, step]);

  function updateName(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugifyName(value));
  }

  function canContinue() {
    if (step === 0) return name.trim().length > 0 && slug.trim().length > 0;
    return true;
  }

  async function createWebsite() {
    if (!canManage || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/website/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          template,
          category,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        site?: WebsiteSite;
      };
      if (!response.ok || !data.site) {
        throw new Error(data.error || "Unable to create website.");
      }

      const presetId = LEGACY_WIZARD_PRESET_MAP[selectedTheme.id];
      const preset = presetId ? getThemePreset(presetId) : undefined;
      const themeResponse = await fetch(
        `/api/website/sites/${data.site.id}/theme`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            preset
              ? { tokens: preset.tokens }
              : {
                  primaryColor: selectedTheme.primaryColor,
                  secondaryColor: selectedTheme.secondaryColor,
                  backgroundColor: selectedTheme.backgroundColor,
                  textColor: "#18181b",
                  mutedColor: "#71717a",
                },
          ),
        },
      );
      if (!themeResponse.ok) {
        throw new Error("Website created, but the theme could not be applied.");
      }

      await fetch(`/api/website/sites/${data.site.id}/header`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoText: name.trim(),
          ctaLabel: category === "retail" ? "Shop now" : "Contact us",
          ctaHref: category === "retail" ? "/products" : "/contact",
        }),
      });

      router.push(`/website/${data.site.id}/pages`);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create website.");
      setPending(false);
    }
  }

  if (!open) return null;

  const currentStep = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-website-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-zinc-200 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                New website
              </p>
              <h2
                id="create-website-title"
                className="mt-1 text-xl font-semibold tracking-tight text-zinc-900"
              >
                {currentStep.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
              disabled={pending}
              aria-label="Close create website dialog"
            >
              Cancel
            </button>
          </div>
          <ol className="mt-5 flex gap-1.5" aria-label="Setup steps">
            {STEPS.map((item, index) => (
              <li key={item.id} className="flex-1">
                <div
                  className={`h-1 rounded-full transition ${
                    index <= step ? "bg-zinc-900" : "bg-zinc-200"
                  }`}
                  aria-current={index === step ? "step" : undefined}
                  title={item.label}
                />
                <span className="sr-only">
                  {item.label}
                  {index === step ? " (current)" : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <label className={authLabelClassName} htmlFor="wizard-name">
                  Website name
                </label>
                <input
                  id="wizard-name"
                  className={authInputClassName}
                  value={name}
                  onChange={(event) => updateName(event.target.value)}
                  placeholder="Acme Studio"
                  autoFocus
                />
                <p className="mt-1.5 text-xs text-zinc-500">
                  This appears in your header and browser tab.
                </p>
              </div>
              <div>
                <label className={authLabelClassName} htmlFor="wizard-slug">
                  Website address
                </label>
                <div className="flex overflow-hidden rounded-md border border-zinc-300 focus-within:ring-2 focus-within:ring-zinc-400">
                  <span className="flex items-center bg-zinc-50 px-3 text-sm text-zinc-500">
                    /p/
                  </span>
                  <input
                    id="wizard-slug"
                    className="w-full border-0 px-3 py-2 text-sm outline-none"
                    value={slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setSlug(slugifyName(event.target.value));
                    }}
                    placeholder="acme-studio"
                  />
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Generated automatically. Edit only if you need a custom path.
                </p>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  aria-pressed={category === item.id}
                  className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2 ${
                    category === item.id
                      ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80"
                  }`}
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{item.description}</p>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              {TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTemplate(item.id)}
                  aria-pressed={template === item.id}
                  className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2 ${
                    template === item.id
                      ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80"
                  }`}
                >
                  <TemplateThumbnail id={item.id} selected={template === item.id} />
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-zinc-900">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setThemeId(theme.id)}
                  aria-pressed={themeId === theme.id}
                  className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2 ${
                    themeId === theme.id
                      ? "border-zinc-900 ring-1 ring-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div
                    className="mb-3 overflow-hidden rounded-lg border border-black/5"
                    style={{ background: theme.backgroundColor }}
                  >
                    <div
                      className="h-3 w-full"
                      style={{ background: theme.primaryColor }}
                    />
                    <div className="space-y-1.5 p-2.5">
                      <div
                        className="h-2 w-1/2 rounded-full"
                        style={{ background: theme.primaryColor, opacity: 0.85 }}
                      />
                      <div
                        className="h-1.5 w-3/4 rounded-full"
                        style={{ background: theme.secondaryColor, opacity: 0.35 }}
                      />
                      <div
                        className="mt-2 h-5 w-14 rounded-md"
                        style={{ background: theme.accent }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {theme.label}
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="flex items-start gap-4">
                <TemplateThumbnail id={template} selected />
                <div className="min-w-0 flex-1 space-y-3">
                  <ReviewRow label="Website name" value={name.trim()} />
                  <ReviewRow label="Address" value={`/p/${slug.trim()}`} />
                  <ReviewRow
                    label="Category"
                    value={selectedCategory?.label ?? category}
                  />
                  <ReviewRow
                    label="Template"
                    value={selectedTemplate?.label ?? template}
                  />
                  <ReviewRow label="Theme" value={selectedTheme.label} />
                </div>
              </div>
              <div
                className="h-14 overflow-hidden rounded-xl border border-black/5"
                style={{ background: selectedTheme.backgroundColor }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${selectedTheme.primaryColor}, ${selectedTheme.secondaryColor})`,
                    opacity: 0.9,
                  }}
                />
              </div>
              <p className="text-sm leading-relaxed text-zinc-600">
                We&apos;ll create your pages, apply the theme, and open the
                editor so you can start customizing.
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            className={`${authSecondaryButtonClassName} !w-auto px-4`}
            onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
            disabled={pending}
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-5`}
              disabled={!canContinue()}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-5`}
              disabled={pending || !canManage}
              onClick={() => void createWebsite()}
            >
              {pending ? "Creating website…" : "Create website"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateThumbnail({
  id,
  selected = false,
}: {
  id: (typeof TEMPLATES)[number]["id"] | string;
  selected?: boolean;
}) {
  return (
    <div
      className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border bg-white shadow-sm ${
        selected ? "border-zinc-400" : "border-zinc-200"
      }`}
      aria-hidden
    >
      <div className="absolute inset-x-0 top-0 h-3 bg-zinc-100">
        <div className="absolute left-1.5 top-1 h-1 w-6 rounded-full bg-zinc-300" />
        <div className="absolute right-1.5 top-1 flex gap-0.5">
          <span className="h-1 w-1 rounded-full bg-zinc-300" />
          <span className="h-1 w-1 rounded-full bg-zinc-300" />
        </div>
      </div>

      {id === "showcase" ? (
        <>
          <div className="absolute inset-x-0 top-3 bottom-0 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-500" />
          <div className="absolute inset-x-3 top-7 space-y-1">
            <div className="h-1.5 w-2/3 rounded-full bg-white/90" />
            <div className="h-1 w-1/2 rounded-full bg-white/50" />
            <div className="mt-2 h-3 w-10 rounded-sm bg-white/85" />
          </div>
        </>
      ) : id === "catalog" ? (
        <>
          <div className="absolute inset-x-1.5 top-4 grid grid-cols-3 gap-1">
            {[0, 1, 2, 3, 4, 5].map((tile) => (
              <div
                key={tile}
                className="aspect-square rounded-sm bg-zinc-200"
                style={{
                  background:
                    tile % 3 === 0
                      ? "#d4d4d8"
                      : tile % 3 === 1
                        ? "#e4e4e7"
                        : "#f4f4f5",
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-x-0 top-3 h-8 bg-gradient-to-r from-zinc-200 to-zinc-100" />
          <div className="absolute inset-x-2 top-4 space-y-1">
            <div className="h-1.5 w-1/2 rounded-full bg-zinc-500/70" />
            <div className="h-1 w-2/3 rounded-full bg-zinc-400/40" />
          </div>
          <div className="absolute inset-x-2 bottom-2 grid grid-cols-3 gap-1">
            <div className="h-4 rounded-sm bg-zinc-100" />
            <div className="h-4 rounded-sm bg-zinc-100" />
            <div className="h-4 rounded-sm bg-zinc-100" />
          </div>
        </>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate font-medium text-zinc-900">{value}</span>
    </div>
  );
}
