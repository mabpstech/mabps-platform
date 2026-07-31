"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

function PageBuilderLoading() {
  return (
    <div
      className="space-y-4 animate-[fadeRise_200ms_ease-out]"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-2.5 w-20 animate-pulse rounded bg-zinc-200" />
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-48 max-w-full animate-pulse rounded-lg bg-zinc-200" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-100" />
          </div>
          <div className="h-3.5 w-72 max-w-full animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-zinc-100" />
          <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-100" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5">
          <div className="h-2.5 w-16 animate-pulse rounded bg-zinc-100" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-100" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-zinc-50" />
          <div className="space-y-1.5 pt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-xl bg-zinc-50"
              />
            ))}
          </div>
        </aside>
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="h-3 w-28 animate-pulse rounded bg-zinc-100" />
          <div className="h-40 animate-pulse rounded-xl bg-zinc-50" />
          <div className="h-24 animate-pulse rounded-xl bg-zinc-50" />
          <p className="pt-2 text-center text-sm font-medium text-zinc-600">
            Opening editor…
          </p>
          <p className="text-center text-xs text-zinc-400">
            Loading the page builder — this usually takes a moment.
          </p>
        </div>
      </div>
      <span className="sr-only">Loading page builder</span>
    </div>
  );
}

const PageBuilderClient = dynamic(
  () =>
    import("@/components/website/page-builder").then((mod) => mod.PageBuilder),
  {
    ssr: false,
    loading: () => <PageBuilderLoading />,
  },
);

type PageBuilderProps = ComponentProps<
  typeof import("@/components/website/page-builder").PageBuilder
>;

export function PageBuilderDynamic(props: PageBuilderProps) {
  return <PageBuilderClient {...props} />;
}
