"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

/** Fake pipeline stages for the progress UX (maps to generation statuses). */
const PROGRESS_STAGES = [
  {
    id: "parsing",
    label: "Understanding your vision",
    detail: "Reading intent, audience, and tone from your prompt.",
    durationMs: 1800,
  },
  {
    id: "generating",
    label: "Designing your website",
    detail: "Shaping pages, layout, and brand direction.",
    durationMs: 2600,
  },
  {
    id: "validating",
    label: "Refining the details",
    detail: "Checking structure, navigation, and content balance.",
    durationMs: 1800,
  },
  {
    id: "applying",
    label: "Assembling your site",
    detail: "Preparing an editable website in the builder.",
    durationMs: 2200,
  },
] as const;

type Phase = "prompt" | "progress" | "complete";

export function AiCreateExperience({ canManage }: { canManage: boolean }) {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [prompt, setPrompt] = useState("");
  const [activeExample, setActiveExample] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittedPrompt = useRef("");

  useEffect(() => {
    if (phase !== "prompt") return;
    textareaRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "progress") return;

    let cancelled = false;
    let frame = 0;
    let stage = 0;
    let stageStartedAt = performance.now();
    const stageWeights = PROGRESS_STAGES.map((item) => item.durationMs);
    const totalDuration = stageWeights.reduce((sum, ms) => sum + ms, 0);

    function tick(now: number) {
      if (cancelled) return;

      const elapsedInStage = now - stageStartedAt;
      const stageDuration = stageWeights[stage] ?? 1;
      const completedBefore = stageWeights
        .slice(0, stage)
        .reduce((sum, ms) => sum + ms, 0);
      const stageProgress = Math.min(1, elapsedInStage / stageDuration);
      const overall = Math.min(
        0.98,
        (completedBefore + stageProgress * stageDuration) / totalDuration,
      );

      setStageIndex(stage);
      setProgress(overall * 100);

      if (elapsedInStage >= stageDuration) {
        if (stage >= PROGRESS_STAGES.length - 1) {
          setProgress(100);
          setPhase("complete");
          return;
        }
        stage += 1;
        stageStartedAt = now;
      }

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

  function startGeneration() {
    if (!canManage) return;
    const value = prompt.trim();
    if (!value || phase !== "prompt") return;
    submittedPrompt.current = value;
    setStageIndex(0);
    setProgress(0);
    setPhase("progress");
  }

  function resetToPrompt() {
    setPhase("prompt");
    setStageIndex(0);
    setProgress(0);
  }

  if (phase === "progress" || phase === "complete") {
    const stage = PROGRESS_STAGES[Math.min(stageIndex, PROGRESS_STAGES.length - 1)];
    const done = phase === "complete";

    return (
      <CreateJourneyShell
        eyebrow="Generate with AI"
        title={done ? "Your website is taking shape" : "Creating your website"}
        description={
          done
            ? "We've walked through the full generation experience. Live AI creation will open your editable site in the builder next."
            : "Sit tight — we're shaping something beautiful from your description."
        }
        backHref={done ? "/website/new" : undefined}
        backLabel={done ? "Choose path" : "Edit prompt"}
        onBack={done ? undefined : resetToPrompt}
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
                  done ? "bg-zinc-900" : "bg-zinc-100"
                }`}
              >
                {!done ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-[createPulse_2.4s_ease-in-out_infinite] rounded-full bg-zinc-900/10"
                  />
                ) : null}
                {done ? (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    className="animate-[fadeRise_0.45s_ease-out]"
                    aria-hidden
                  >
                    <path
                      d="M7 14.5 11.5 19 21 9.5"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
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
                {done ? "Ready when generation connects" : stage.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {done
                  ? "Your prompt is saved in this session. No website was created yet."
                  : stage.detail}
              </p>

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

              <ol className="mt-10 w-full space-y-3 text-left">
                {PROGRESS_STAGES.map((item, index) => {
                  const complete = done || index < stageIndex;
                  const active = !done && index === stageIndex;
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

              {submittedPrompt.current ? (
                <blockquote className="mt-8 w-full rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-left text-sm leading-relaxed text-zinc-600">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Your prompt
                  </p>
                  <p className="mt-1.5 line-clamp-3">{submittedPrompt.current}</p>
                </blockquote>
              ) : null}

              {done ? (
                <div className="mt-8 flex w-full flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    className={`${authButtonClassName} !w-auto px-5`}
                    onClick={resetToPrompt}
                  >
                    Try another prompt
                  </button>
                  <Link
                    href="/website"
                    className={`${authSecondaryButtonClassName} !w-auto px-5`}
                  >
                    Back to websites
                  </Link>
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
    );
  }

  return (
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
                disabled={prompt.trim().length === 0}
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
