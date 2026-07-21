"use client";

export function MediaSkeleton({
  count = 12,
  view = "grid",
}: {
  count?: number;
  view?: "grid" | "list";
}) {
  if (view === "list") {
    return (
      <div className="space-y-2" aria-busy>
        {Array.from({ length: Math.min(count, 8) }).map((_, index) => (
          <div
            key={index}
            className="flex animate-pulse items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3"
          >
            <div className="h-12 w-12 rounded-lg bg-zinc-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-zinc-100" />
              <div className="h-2.5 w-1/4 rounded bg-zinc-50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-busy
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-xl border border-zinc-200 bg-white"
        >
          <div className="aspect-square bg-zinc-100" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 rounded bg-zinc-100" />
            <div className="h-2.5 w-1/2 rounded bg-zinc-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MediaEmptyIllustration({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-gradient-to-b from-white via-zinc-50/80 to-zinc-100/40 px-6 py-16 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 scale-150 rounded-full bg-zinc-200/40 blur-2xl" />
        <svg
          width="120"
          height="96"
          viewBox="0 0 120 96"
          fill="none"
          aria-hidden
          className="relative"
        >
          <rect
            x="18"
            y="22"
            width="70"
            height="52"
            rx="10"
            fill="#fff"
            stroke="#d4d4d8"
          />
          <path
            d="M28 58l16-18 12 12 10-8 16 14"
            stroke="#a1a1aa"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="42" cy="38" r="5" fill="#d4d4d8" />
          <rect
            x="48"
            y="14"
            width="54"
            height="40"
            rx="10"
            fill="#fafafa"
            stroke="#a1a1aa"
            opacity="0.9"
          />
          <path
            d="M58 42l12-12 8 8 7-6 11 10"
            stroke="#71717a"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-zinc-900">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
