"use client";

export function EmptyState({
  title,
  description,
  action,
  icon,
  compact = false,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  /** Tighter layout for sidebars and nested panels. */
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center border border-dashed border-zinc-300/90 bg-gradient-to-b from-white via-zinc-50/70 to-zinc-100/40 text-center animate-[fadeRise_280ms_ease-out] ${
        compact
          ? "rounded-xl px-4 py-10"
          : "rounded-2xl px-6 py-16"
      }`}
    >
      <div className={compact ? "mb-4" : "mb-5"}>
        {icon ?? (
          <div className="relative">
            <div className="absolute inset-0 scale-150 rounded-full bg-zinc-200/35 blur-xl" />
            <div
              className={`relative flex items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 shadow-[0_8px_20px_rgba(15,23,42,0.06)] ${
                compact ? "h-11 w-11" : "h-14 w-14"
              }`}
            >
              <svg
                width={compact ? "20" : "24"}
                height={compact ? "20" : "24"}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </div>
          </div>
        )}
      </div>
      <h3
        className={`font-semibold tracking-tight text-zinc-900 ${
          compact ? "text-sm" : "text-base"
        }`}
      >
        {title}
      </h3>
      <p
        className={`mt-1.5 max-w-md leading-relaxed text-zinc-500 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {description}
      </p>
      {action ? (
        <div className={compact ? "mt-4" : "mt-6"}>{action}</div>
      ) : null}
    </div>
  );
}

export function LoadingSkeleton({
  rows = 3,
  variant = "cards",
}: {
  rows?: number;
  /** `cards` for grids; `panel` for editor sidebars/inspectors. */
  variant?: "cards" | "panel" | "list";
}) {
  if (variant === "panel") {
    return (
      <div
        className="animate-pulse space-y-4 rounded-2xl border border-zinc-200 bg-white p-5"
        aria-busy="true"
        aria-label="Loading editor"
      >
        <div className="h-3 w-24 rounded bg-zinc-100" />
        <div className="h-9 w-full rounded-lg bg-zinc-100" />
        <div className="h-9 w-full rounded-lg bg-zinc-50" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="h-16 rounded-xl bg-zinc-50" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-2.5" aria-busy="true" aria-label="Loading">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="flex animate-pulse items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="h-10 w-10 rounded-lg bg-zinc-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-zinc-100" />
              <div className="h-2.5 w-1/4 rounded bg-zinc-50" />
            </div>
            <div className="h-8 w-16 rounded-md bg-zinc-50" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <div className="mb-4 h-2 w-full rounded-full bg-zinc-100" />
          <div className="mb-4 flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-zinc-100" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-2/3 rounded bg-zinc-100" />
              <div className="h-3 w-1/2 rounded bg-zinc-50" />
            </div>
          </div>
          <div className="mb-4 space-y-2">
            <div className="h-3 w-full rounded bg-zinc-50" />
            <div className="h-3 w-4/5 rounded bg-zinc-50" />
          </div>
          <div className="h-8 w-full rounded-lg bg-zinc-50" />
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status:
    | "draft"
    | "publishing"
    | "published"
    | "failed"
    | "unpublished"
    | string;
}) {
  const map: Record<string, { label: string; className: string }> = {
    draft: {
      label: "Draft",
      className: "bg-zinc-100 text-zinc-600 ring-zinc-200",
    },
    publishing: {
      label: "Publishing...",
      className: "bg-sky-50 text-sky-700 ring-sky-200",
    },
    published: {
      label: "Live",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    failed: {
      label: "Failed",
      className: "bg-rose-50 text-rose-700 ring-rose-200",
    },
    unpublished: {
      label: "Draft",
      className: "bg-zinc-100 text-zinc-600 ring-zinc-200",
    },
  };
  const item = map[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-[-0.01em] ring-1 ring-inset ${item.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "published"
            ? "bg-emerald-500"
            : status === "publishing"
              ? "bg-sky-500"
              : status === "failed"
                ? "bg-rose-500"
                : "bg-zinc-400"
        }`}
        aria-hidden
      />
      {item.label}
    </span>
  );
}
