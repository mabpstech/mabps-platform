export default function PageEditorLoading() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-2.5 w-20 animate-pulse rounded bg-zinc-200" />
          <div className="h-8 w-48 max-w-full animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-3.5 w-72 max-w-full animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-100" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="h-72 animate-pulse rounded-2xl border border-zinc-100 bg-zinc-50" />
        <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white px-6 text-center">
          <div className="mb-4 h-10 w-10 animate-pulse rounded-full bg-zinc-100" />
          <p className="text-sm font-medium text-zinc-700">Opening editor…</p>
          <p className="mt-1 max-w-sm text-xs text-zinc-400">
            Preparing your page — hang tight while the editor loads.
          </p>
        </div>
      </div>
      <span className="sr-only">Opening page editor</span>
    </div>
  );
}
