export default function WebsiteLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-3 w-16 rounded bg-zinc-200" />
        <div className="h-8 w-56 max-w-full rounded-lg bg-zinc-200" />
        <div className="h-4 w-80 max-w-full rounded bg-zinc-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-2xl border border-zinc-100 bg-zinc-50" />
        <div className="h-28 rounded-2xl border border-zinc-100 bg-zinc-50" />
        <div className="h-28 rounded-2xl border border-zinc-100 bg-zinc-50" />
      </div>
      <div className="h-48 rounded-2xl border border-zinc-100 bg-zinc-50" />
      <span className="sr-only">Loading website…</span>
    </div>
  );
}
