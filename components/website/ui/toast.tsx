"use client";

import { useEffect } from "react";

export type ToastTone = "success" | "error" | "info";

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
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-zinc-200 bg-white text-zinc-800";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 max-w-sm animate-[fadeIn_180ms_ease-out] rounded-xl border px-4 py-3 text-sm shadow-lg ${toneClass}`}
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium opacity-60 transition hover:opacity-100"
          aria-label="Dismiss"
        >
          Close
        </button>
      </div>
    </div>
  );
}
