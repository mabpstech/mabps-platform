import Link from "next/link";

export function CreateJourneyShell({
  children,
  eyebrow = "Create website",
  title,
  description,
  backHref = "/website",
  backLabel = "Websites",
  onBack,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
}) {
  const backClassName =
    "inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2";

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -top-24 h-72 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(24,24,27,0.06),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-32 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(24,24,27,0.04),transparent_68%)]"
      />

      <div className="relative animate-[fadeRise_0.5s_ease-out]">
        {onBack ? (
          <button type="button" onClick={onBack} className={backClassName}>
            <span aria-hidden className="text-base leading-none">
              ←
            </span>
            {backLabel}
          </button>
        ) : (
          <Link href={backHref} className={backClassName}>
            <span aria-hidden className="text-base leading-none">
              ←
            </span>
            {backLabel}
          </Link>
        )}

        <header className="mt-8 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-xl text-base leading-relaxed text-zinc-500">
              {description}
            </p>
          ) : null}
        </header>

        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
