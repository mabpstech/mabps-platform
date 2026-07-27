"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateSiteWizard } from "@/components/website/create-site-wizard";
import { CreateJourneyShell } from "@/components/website/create/create-journey-shell";

const PATHS = [
  {
    id: "template",
    label: "Start from Template",
    description:
      "Pick a layout, theme, and category. Ideal when you already know the structure you want.",
    accent: "from-zinc-100 via-white to-zinc-50",
    icon: TemplateGlyph,
  },
  {
    id: "ai",
    label: "Generate with AI",
    description:
      "Describe your business in a sentence. We design the site structure, copy, and look for you.",
    accent: "from-zinc-900 via-zinc-800 to-zinc-700",
    icon: AiGlyph,
    featured: true,
  },
] as const;

export function ChooseCreatePath({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);

  function selectPath(id: (typeof PATHS)[number]["id"]) {
    if (!canManage) return;
    if (id === "template") {
      setWizardOpen(true);
      return;
    }
    router.push("/website/new/ai");
  }

  return (
    <>
      <CreateJourneyShell
        title="How would you like to begin?"
        description="Choose a starting point. You can always refine pages, theme, and content in the editor."
      >
        {!canManage ? (
          <p
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="status"
          >
            Only workspace owners and admins can create websites.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {PATHS.map((path, index) => {
              const Icon = path.icon;
              const featured = "featured" in path && path.featured;
              return (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => selectPath(path.id)}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2 ${
                    featured
                      ? "border-zinc-900 bg-zinc-950 text-white shadow-lg shadow-zinc-900/10 hover:-translate-y-0.5 hover:shadow-xl"
                      : "border-zinc-200 bg-white text-zinc-900 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
                  }`}
                  style={{
                    animation: `fadeRise 0.5s ease-out ${index * 80}ms both`,
                  }}
                >
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${path.accent} ${
                      featured ? "opacity-100" : "opacity-70"
                    }`}
                  />
                  <div className="relative flex flex-1 flex-col">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition duration-300 ${
                        featured
                          ? "bg-white/10 text-white ring-1 ring-white/15 group-hover:bg-white/15"
                          : "bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200/80"
                      }`}
                    >
                      <Icon />
                    </span>
                    <p
                      className={`mt-6 text-lg font-semibold tracking-tight ${
                        featured ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {path.label}
                    </p>
                    <p
                      className={`mt-2 flex-1 text-sm leading-relaxed ${
                        featured ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {path.description}
                    </p>
                    <span
                      className={`mt-6 inline-flex items-center gap-1.5 text-sm font-medium transition ${
                        featured
                          ? "text-white group-hover:gap-2.5"
                          : "text-zinc-900 group-hover:gap-2.5"
                      }`}
                    >
                      Continue
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CreateJourneyShell>

      <CreateSiteWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        canManage={canManage}
      />
    </>
  );
}

function TemplateGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="3"
        width="15"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2.5 7.5h15M8 7.5v9.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AiGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2.5v2.2M10 15.3V17.5M2.5 10h2.2M15.3 10H17.5M4.6 4.6l1.55 1.55M13.85 13.85l1.55 1.55M4.6 15.4l1.55-1.55M13.85 6.15l1.55-1.55"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="2.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
