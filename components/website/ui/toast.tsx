"use client";

import { useEffect } from "react";

export type ToastTone = "success" | "error" | "info";

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (tone === "error") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 8v5m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 8h.01M11 12h1v4h1M12 3a9 9 0 100 18 9 9 0 000-18z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Toast({
  message,
  tone = "info",
  onDismiss,
  durationMs = 3200,
}: {
  message: string | null;
  tone?: ToastTone;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  const toneClass =
    tone === "success"
      ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-950"
      : tone === "error"
        ? "border-red-200/80 bg-red-50/95 text-red-950"
        : "border-zinc-200/80 bg-white/95 text-zinc-900";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 max-w-sm animate-[fadeRise_220ms_ease-out] rounded-2xl border px-3.5 py-3 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-md ${toneClass}`}
    >
      <div className="flex items-start gap-3">
        <ToastIcon tone={tone} />
        <p className="flex-1 pt-0.5 leading-relaxed tracking-[-0.01em]">
          {message}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-current opacity-45 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
