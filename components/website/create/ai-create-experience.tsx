"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { CreateJourneyShell } from "@/components/website/create/create-journey-shell";

const EXAMPLE_PROMPTS = [
  {
    label: "Jewellery Store",
    prompt:
      "A luxury jewellery store specializing in handcrafted gold and diamond pieces for modern celebrations.",
  },
  {
    label: "Restaurant",
    prompt:
      "A warm neighbourhood restaurant serving seasonal tasting menus with an intimate dining room.",
  },
  {
    label: "Personal Brand",
    prompt:
      "A personal brand site for a creative consultant — portfolio, services, and a clear booking path.",
  },
  {
    label: "Spiritual Organisation",
    prompt:
      "A spiritual organisation sharing teachings, events, and community gatherings with a calm, welcoming tone.",
  },
  {
    label: "Startup",
    prompt:
      "An early-stage B2B startup with a product landing page, pricing, and a strong call to request a demo.",
  },
] as const;

/** Pipeline stages aligned with generation progress UX. */
const PROGRESS_STAGES = [
  {
    id: "parsing",
    label: "Understanding your vision",
    detail: "Reading intent, audience, and tone from your prompt.",
  },
  {
    id: "generating",
    label: "Designing your website",
    detail: "Shaping pages, layout, and brand direction.",
  },
  {
    id: "validating",
    label: "Refining the details",
    detail: "Checking structure, navigation, and content balance.",
  },
  {
    id: "applying",
    label: "Assembling your site",
    detail: "Opening an editable website in the builder.",
  },
] as const;

type Phase = "prompt" | "progress" | "error";

export function AiCreateExperience({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("prompt");
  const [prompt, setPrompt] = useState("");
  const [activeExample, setActiveExample] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const generationDone = useRef(false);

  useEffect(() => {
    if (phase !== "prompt") return;
    textareaRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "progress") return;

    let cancelled = false;
    let frame = 0;
    let stage = 0;
    const stageDurationMs = 2200;
    const startedAt = performance.now();

    function tick(now: number) {
      if (cancelled) return;

      const elapsed = now - startedAt;
      const rawStage = Math.min(
        PROGRESS_STAGES.length - 1,
        Math.floor(elapsed / stageDurationMs),
      );
      stage = generationDone.current
        ? PROGRESS_STAGES.length - 1
        : Math.min(rawStage, PROGRESS_STAGES.length - 2);

      const overall = generationDone.current
        ? 100
        : Math.min(92, (elapsed / (stageDurationMs * PROGRESS_STAGES.length)) * 100);

      setStageIndex(stage);
      setProgress(overall);

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [phase]);

  function applyExample(example: (typeof EXAMPLE_PROMPTS)[number]) {
    setActiveExample(example.label);
    setPrompt(example.prompt);
    textareaRef.current?.focus();
  }

  function resetToPrompt() {
    generationDone.current = false;
    setPhase("prompt");
    setStageIndex(0);
    setProgress(0);
    setErrorMessage(null);
  }

  function startGeneration() {
    if (!canManage || isPending) return;
    const value = prompt.trim();
    if (!value || phase === "progress") return;

    setSubmittedPrompt(value);
    generationDone.current = false;
    setErrorMessage(null);
    setStageIndex(0);
    setProgress(0);
    setPhase("progress");

    startTransition(async () => {
      try {
        const response = await fetch("/api/website/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: value }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          siteId?: string;
          builderHref?: string;
        };

        if (!response.ok || !data.siteId) {
          throw new Error(
            data.error || "Website generation failed. Please try again.",
          );
        }

        generationDone.current = true;
        setProgress(100);
        setStageIndex(PROGRESS_STAGES.length - 1);
        router.push(data.builderHref || `/website/${data.siteId}/pages`);
      } catch (error) {
        generationDone.current = false;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Website generation failed. Please try again.",
        );
        setPhase("error");
      }
    });
  }

  const showProgress = phase === "progress" || phase === "error";
  const stage =
    PROGRESS_STAGES[Math.min(stageIndex, PROGRESS_STAGES.length - 1)];
  const failed = phase === "error";

  return showProgress ? (
    <CreateJourneyShell
      eyebrow="Generate with AI"
      title={failed ? "Generation paused" : "Creating your website"}
      description={
        failed
          ? "Something went wrong while creating your site. Your prompt is saved — try again."
          : "Sit tight — we're shaping something beautiful from your description."
      }
      backHref={failed ? "/website/new" : undefined}
      backLabel={failed ? "Choose path" : "Edit prompt"}
      onBack={failed ? undefined : resetToPrompt}
    >
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.04),transparent_55%)]"
          />

          <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
            <div
              className={`relative flex h-16 w-16 items-center justify-center rounded-full ${
                failed ? "bg-red-50" : "bg-zinc-100"
              }`}
            >
              {!failed ? (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-[createPulse_2.4s_ease-in-out_infinite] rounded-full bg-zinc-900/10"
                />
              ) : null}
              {failed ? (
                <span className="text-lg font-semibold text-red-600" aria-hidden>
                  !
                </span>
              ) : (
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full bg-zinc-900 animate-[createDot_1.2s_ease-in-out_infinite]"
                />
              )}
            </div>

            <p
              className="mt-8 text-xl font-semibold tracking-tight text-zinc-900 transition-opacity duration-300"
              aria-live="polite"
            >
              {failed ? "Couldn’t finish generation" : stage.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {failed
                ? errorMessage || "Please try again in a moment."
                : stage.detail}
            </p>

            {!failed ? (
              <div className="mt-8 w-full">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-zinc-100"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  aria-label="Website generation progress"
                >
                  <div
                    className="h-full rounded-full bg-zinc-900 transition-[width] duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs tabular-nums text-zinc-400">
                  {Math.round(progress)}%
                </p>
              </div>
            ) : null}

            <ol className="mt-10 w-full space-y-3 text-left">
              {PROGRESS_STAGES.map((item, index) => {
                const complete = !failed && index < stageIndex;
                const active = !failed && index === stageIndex;
                return (
                  <li
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition duration-300 ${
                      active ? "bg-zinc-50" : ""
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        complete
                          ? "bg-zinc-900 text-white"
                          : active
                            ? "bg-zinc-900/10 text-zinc-900 ring-1 ring-zinc-900/20"
                            : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      {complete ? "✓" : index + 1}
                    </span>
                    <span
                      className={`text-sm ${
                        complete || active
                          ? "font-medium text-zinc-900"
                          : "text-zinc-400"
                      }`}
                    >
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {submittedPrompt ? (
              <blockquote className="mt-8 w-full rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-left text-sm leading-relaxed text-zinc-600">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Your prompt
                </p>
                <p className="mt-1.5 line-clamp-3">{submittedPrompt}</p>
              </blockquote>
            ) : null}

            {failed ? (
              <div className="mt-8 flex w-full flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className={`${authButtonClassName} !w-auto px-5`}
                  onClick={startGeneration}
                >
                  Try again
                </button>
                <button
                  type="button"
                  className={`${authSecondaryButtonClassName} !w-auto px-5`}
                  onClick={resetToPrompt}
                >
                  Edit prompt
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="mt-8 text-sm text-zinc-400 underline-offset-2 transition hover:text-zinc-700 hover:underline"
                onClick={resetToPrompt}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </CreateJourneyShell>
  ) : (
    <CreateJourneyShell
      eyebrow="Generate with AI"
      title="Describe the website you want"
      description="One clear prompt is enough. Start from an example or write your own."
      backHref="/website/new"
      backLabel="Choose path"
    >
      {!canManage ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          Only workspace owners and admins can generate websites.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <label htmlFor="ai-website-prompt" className="sr-only">
              Website prompt
            </label>
            <textarea
              id="ai-website-prompt"
              ref={textareaRef}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setActiveExample(null);
              }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  startGeneration();
                }
              }}
              rows={6}
              placeholder="e.g. A calm wellness studio in Kochi offering yoga classes, retreats, and memberships…"
              className="min-h-[168px] w-full resize-none border-0 bg-transparent px-6 py-5 text-base leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:ring-0 sm:px-7 sm:py-6 sm:text-[17px]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4 sm:px-7">
              <p className="text-xs text-zinc-400">
                Press{" "}
                <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[11px] text-zinc-500">
                  ⌘
                </kbd>{" "}
                +{" "}
                <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[11px] text-zinc-500">
                  Enter
                </kbd>{" "}
                to generate
              </p>
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-5`}
                disabled={prompt.trim().length === 0 || isPending}
                onClick={startGeneration}
              >
                Generate website
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Try an example
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((example, index) => {
                const selected = activeExample === example.label;
                return (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => applyExample(example)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2 ${
                      selected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                    style={{
                      animation: `fadeRise 0.45s ease-out ${index * 40}ms both`,
                    }}
                  >
                    {example.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </CreateJourneyShell>
  );
}
