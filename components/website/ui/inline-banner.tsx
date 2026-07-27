"use client";

export type BannerTone = "success" | "error" | "info";

function BannerIcon({ tone }: { tone: BannerTone }) {
  if (tone === "success") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 8v5m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8h.01M11 12h1v4h1M12 3a9 9 0 100 18 9 9 0 000-18z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InlineBanner({
  message,
  tone = "info",
}: {
  message: string | null | undefined;
  tone?: BannerTone;
}) {
  if (!message) return null;

  const toneClass =
    tone === "success"
      ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-900"
      : tone === "error"
        ? "border-red-200/90 bg-red-50/90 text-red-900"
        : "border-zinc-200 bg-zinc-50 text-zinc-800";

  const iconWrap =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "error"
        ? "bg-red-100 text-red-700"
        : "bg-zinc-200/70 text-zinc-600";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-relaxed tracking-[-0.01em] animate-[fadeRise_200ms_ease-out] ${toneClass}`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconWrap}`}
      >
        <BannerIcon tone={tone} />
      </span>
      <p className="min-w-0 flex-1 pt-0.5">{message}</p>
    </div>
  );
}
