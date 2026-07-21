"use client";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-gradient-to-b from-white to-zinc-50 px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
        <svg
          width="22"
          height="22"
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
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <div className="mb-4 h-12 w-12 rounded-xl bg-zinc-100" />
          <div className="mb-2 h-4 w-2/3 rounded bg-zinc-100" />
          <div className="mb-4 h-3 w-1/2 rounded bg-zinc-100" />
          <div className="h-8 w-full rounded-lg bg-zinc-50" />
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: "draft" | "published" | "unpublished" | string;
}) {
  const map: Record<string, { label: string; className: string }> = {
    draft: {
      label: "Draft",
      className: "bg-zinc-100 text-zinc-600 ring-zinc-200",
    },
    published: {
      label: "Published",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    unpublished: {
      label: "Unpublished",
      className: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    },
  };
  const item = map[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${item.className}`}
    >
      {item.label}
    </span>
  );
}
