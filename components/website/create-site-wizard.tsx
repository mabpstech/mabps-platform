"use client";

import { useMemo, useState } from "react";
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
  "Name",
  "Category",
  "Template",
  "Theme",
  "Review",
  "Create",
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
      await fetch(`/api/website/sites/${data.site.id}/theme`, {
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
      });

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        aria-label="Create website"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-zinc-200 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                New website
              </p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-900">
                {STEPS[step]}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-500 hover:text-zinc-900"
              disabled={pending}
            >
              Cancel
            </button>
          </div>
          <ol className="mt-5 flex gap-1">
            {STEPS.map((label, index) => (
              <li key={label} className="flex-1">
                <div
                  className={`h-1 rounded-full transition ${
                    index <= step ? "bg-zinc-900" : "bg-zinc-200"
                  }`}
                />
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
                  className={`rounded-xl border p-4 text-left transition ${
                    category === item.id
                      ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300"
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
                  className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition ${
                    template === item.id
                      ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="h-16 w-24 shrink-0 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
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
                  className={`rounded-xl border p-4 text-left transition ${
                    themeId === theme.id
                      ? "border-zinc-900 ring-1 ring-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div
                    className="mb-3 h-16 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                    }}
                  />
                  <p className="text-sm font-semibold text-zinc-900">
                    {theme.label}
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          {step === 4 || step === 5 ? (
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
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
              <div
                className="h-20 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${selectedTheme.primaryColor}, ${selectedTheme.secondaryColor})`,
                }}
              />
              {step === 5 ? (
                <p className="text-sm text-zinc-600">
                  We&apos;ll create your pages, apply the theme, and open the
                  editor so you can start customizing.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
          {step < 5 ? (
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value}</span>
    </div>
  );
}
