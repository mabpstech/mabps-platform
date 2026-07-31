"use client";

import Link from "next/link";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";

export type OnboardingStep = "workspace" | "website" | "publish";

const STEPS: Array<{ id: OnboardingStep; label: string; number: number }> = [
  { id: "workspace", label: "Workspace", number: 1 },
  { id: "website", label: "Website", number: 2 },
  { id: "publish", label: "Publish", number: 3 },
];

export function OnboardingProgress({ current }: { current: OnboardingStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="flex flex-wrap items-center gap-3 sm:gap-4" aria-label="Setup progress">
      {STEPS.map((step, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-3 sm:gap-4">
            {index > 0 ? (
              <span
                className={`hidden h-px w-6 sm:block ${
                  complete ? "bg-zinc-900" : "bg-zinc-200"
                }`}
                aria-hidden
              />
            ) : null}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  complete || active
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {complete ? "✓" : step.number}
              </span>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  Step {step.number}
                </p>
                <p
                  className={`text-sm font-medium ${
                    active ? "text-zinc-900" : "text-zinc-500"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function WelcomeBanner({
  title = "Welcome to MABPS",
  description = "Set up your workspace, create a website, edit your pages, and publish when you are ready for visitors.",
  headingLevel = 1,
}: {
  title?: string;
  description?: string;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div>
      <Heading
        className={
          headingLevel === 1
            ? "text-3xl font-semibold tracking-tight text-zinc-900"
            : "text-2xl font-semibold tracking-tight text-zinc-900"
        }
      >
        {title}
      </Heading>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  );
}

export function OnboardingEncouragement({
  message = "Create your website next — then edit and publish when you are ready.",
}: {
  message?: string;
}) {
  return (
    <div
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      role="status"
    >
      {message}
    </div>
  );
}

export function OnboardingQuickActions({
  onCreateWebsite,
  onSkip,
  createHref = "/website/new",
}: {
  onCreateWebsite?: () => void;
  onSkip?: () => void;
  createHref?: string;
}) {
  const createClassName = `${authButtonClassName} !w-auto px-5`;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Quick actions
      </p>
      <div className="flex flex-wrap gap-2">
        {onCreateWebsite ? (
          <button type="button" className={createClassName} onClick={onCreateWebsite}>
            Create Website
          </button>
        ) : (
          <Link href={createHref} className={createClassName}>
            Create Website
          </Link>
        )}
        <Link
          href="/resources"
          className={`${authSecondaryButtonClassName} !w-auto px-4`}
        >
          Browse guides
        </Link>
        {onSkip ? (
          <button
            type="button"
            className="px-3 py-2 text-sm text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
            onClick={onSkip}
          >
            Skip for now
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="px-3 py-2 text-sm text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
          >
            Skip for now
          </Link>
        )}
      </div>
    </div>
  );
}

export function FirstRunPanel({
  currentStep,
  encouragement,
  showQuickActions = true,
  onCreateWebsite,
  onSkip,
  createHref,
  headingLevel = 1,
  children,
}: {
  currentStep: OnboardingStep;
  encouragement?: string;
  showQuickActions?: boolean;
  onCreateWebsite?: () => void;
  onSkip?: () => void;
  createHref?: string;
  headingLevel?: 1 | 2;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-8 rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 p-6 sm:p-8">
      <WelcomeBanner headingLevel={headingLevel} />
      <OnboardingProgress current={currentStep} />
      {encouragement ? (
        <OnboardingEncouragement message={encouragement} />
      ) : null}
      {showQuickActions ? (
        <OnboardingQuickActions
          onCreateWebsite={onCreateWebsite}
          onSkip={onSkip}
          createHref={createHref}
        />
      ) : null}
      {children}
    </div>
  );
}

export const ONBOARDING_SKIP_KEY = "mabps-onboarding-skipped";

export function markOnboardingSkipped() {
  try {
    window.localStorage.setItem(ONBOARDING_SKIP_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

export function isOnboardingSkipped() {
  try {
    return window.localStorage.getItem(ONBOARDING_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}
