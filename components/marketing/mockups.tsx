/** Animated product mockups for the official MABPS marketing site */

export function DashboardPreview() {
  return (
    <div
      className="m-float relative overflow-hidden rounded-[var(--m-radius-lg)] border border-[var(--m-line)] bg-[var(--m-surface-elevated)] shadow-[var(--m-shadow)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-[var(--m-line)] bg-[#fafbfc] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex-1 rounded-md bg-[var(--m-surface)] px-3 py-1 text-[11px] text-[var(--m-muted)]">
          app.mabps.com / dashboard
        </div>
      </div>
      <div className="grid grid-cols-[140px_1fr] md:grid-cols-[168px_1fr]">
        <aside className="border-r border-[var(--m-line)] bg-[#fbfcfd] p-3">
          <p className="m-display px-2 text-lg text-[var(--m-ink)]">MABPS</p>
          <ul className="mt-4 space-y-1 text-[11px]">
            {["Overview", "Website", "CRM", "AI", "Automation", "Analytics"].map(
              (item, i) => (
                <li
                  key={item}
                  className={`rounded-lg px-2 py-1.5 ${
                    i === 0
                      ? "bg-[var(--m-accent-soft)] font-semibold text-[var(--m-accent)]"
                      : "text-[var(--m-muted)]"
                  }`}
                >
                  {item}
                </li>
              ),
            )}
          </ul>
        </aside>
        <div className="space-y-3 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--m-muted)]">Workspace</p>
              <p className="text-sm font-semibold text-[var(--m-ink)]">Northline Studio</p>
            </div>
            <span className="rounded-full bg-[var(--m-accent-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--m-accent)]">
              Live
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Visitors", value: "12.4k" },
              { label: "Leads", value: "384" },
              { label: "AI chats", value: "2.1k" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[var(--m-line)] bg-white p-3"
              >
                <p className="text-[10px] text-[var(--m-muted)]">{stat.label}</p>
                <p className="mt-1 text-sm font-semibold tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[var(--m-line)] bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold">Pipeline this week</p>
              <p className="text-[10px] text-[var(--m-muted)]">Automation healthy</p>
            </div>
            <div className="flex h-20 items-end gap-1.5">
              {[40, 55, 48, 70, 62, 84, 76].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-[linear-gradient(180deg,var(--m-accent),#93b4ff)]"
                  style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeStudioPreview() {
  return (
    <div
      className="overflow-hidden rounded-[var(--m-radius-lg)] border border-[var(--m-line)] bg-white shadow-[var(--m-shadow)]"
      aria-hidden
    >
      <div className="flex items-center justify-between border-b border-[var(--m-line)] px-4 py-3">
        <p className="text-sm font-semibold">Theme Studio</p>
        <span className="rounded-full bg-[var(--m-accent-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--m-accent)]">
          Live preview
        </span>
      </div>
      <div className="grid md:grid-cols-[200px_1fr]">
        <div className="space-y-3 border-r border-[var(--m-line)] bg-[#fbfcfd] p-4 text-[11px]">
          {["Presets", "Brand", "Colors", "Typography", "Buttons", "Animations"].map(
            (item, i) => (
              <div
                key={item}
                className={`rounded-lg px-2 py-1.5 ${
                  i === 2
                    ? "bg-white font-semibold shadow-sm ring-1 ring-[var(--m-line)]"
                    : "text-[var(--m-muted)]"
                }`}
              >
                {item}
              </div>
            ),
          )}
          <div className="pt-2">
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-[var(--m-muted)] uppercase">
              Accent
            </p>
            <div className="flex gap-2">
              {["#155eef", "#0f766e", "#111827", "#b45309"].map((c) => (
                <span
                  key={c}
                  className="h-6 w-6 rounded-full ring-2 ring-white ring-offset-1 ring-offset-[#fbfcfd]"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="m-grid-atmosphere p-5">
          <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--m-accent)] uppercase">
              Brand preview
            </p>
            <p className="m-display mt-2 text-3xl">Build. Automate. Grow.</p>
            <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--m-muted)]">
              Typography, color, and motion tokens applied across header, sections, and CTAs.
            </p>
            <div className="mt-4 flex gap-2">
              <span className="rounded-full bg-[var(--m-ink)] px-3 py-1.5 text-[11px] text-white">
                Primary
              </span>
              <span className="rounded-full border border-[var(--m-line-strong)] px-3 py-1.5 text-[11px]">
                Secondary
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditorPreview() {
  return (
    <div
      className="overflow-hidden rounded-[var(--m-radius-lg)] border border-[var(--m-line)] bg-white shadow-[var(--m-shadow)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-[var(--m-line)] px-4 py-3 text-[11px]">
        <span className="font-semibold">Page builder</span>
        <span className="text-[var(--m-muted)]">·</span>
        <span className="text-[var(--m-muted)]">Home</span>
        <span className="ml-auto rounded-md bg-[var(--m-surface)] px-2 py-1 text-[var(--m-muted)]">
          Desktop · Tablet · Mobile
        </span>
      </div>
      <div className="grid grid-cols-[120px_1fr_140px] md:grid-cols-[150px_1fr_180px]">
        <div className="space-y-2 border-r border-[var(--m-line)] bg-[#fbfcfd] p-3 text-[10px]">
          {["Hero", "Features", "Platform", "CTA"].map((s, i) => (
            <div
              key={s}
              className={`rounded-md border px-2 py-2 ${
                i === 0
                  ? "border-[var(--m-accent)] bg-[var(--m-accent-soft)] font-semibold"
                  : "border-[var(--m-line)] text-[var(--m-muted)]"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="space-y-3 bg-[linear-gradient(180deg,#eef2ff,#f8fafc)] p-4">
          <div className="rounded-xl bg-[var(--m-ink)] p-4 text-white">
            <p className="text-[9px] tracking-[0.14em] text-white/50 uppercase">Hero</p>
            <p className="m-display mt-1 text-xl">Your brand, live in minutes.</p>
            <div className="mt-3 h-1.5 w-16 rounded-full bg-[var(--m-accent)]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 rounded-lg border border-white/80 bg-white/90" />
            ))}
          </div>
        </div>
        <div className="space-y-3 border-l border-[var(--m-line)] bg-[#fbfcfd] p-3 text-[10px]">
          <p className="font-semibold">Section settings</p>
          <label className="block text-[var(--m-muted)]">
            Heading
            <span className="mt-1 block rounded-md border border-[var(--m-line)] bg-white px-2 py-1.5 text-[var(--m-ink)]">
              Your brand, live…
            </span>
          </label>
          <label className="block text-[var(--m-muted)]">
            Padding
            <span className="mt-1 block rounded-md border border-[var(--m-line)] bg-white px-2 py-1.5">
              Large
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export function WorkflowPreview() {
  const steps = ["Trigger", "Condition", "Action", "Result"];
  return (
    <div
      className="overflow-hidden rounded-[var(--m-radius-lg)] border border-[var(--m-line)] bg-white p-6 shadow-[var(--m-shadow-soft)] md:p-8"
      aria-hidden
    >
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        {steps.map((step, i) => (
          <div key={step} className="flex flex-1 items-center gap-3">
            <div className="min-w-0 flex-1 rounded-2xl border border-[var(--m-line)] bg-[var(--m-surface)] px-4 py-4 text-center">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--m-accent)] uppercase">
                Step {i + 1}
              </p>
              <p className="mt-1 text-sm font-semibold">{step}</p>
            </div>
            {i < steps.length - 1 ? (
              <div className="hidden h-px flex-1 bg-[var(--m-line-strong)] md:block" />
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-[var(--m-muted)]">
        Form submitted → Lead is qualified → WhatsApp + CRM update → Conversion tracked
      </p>
    </div>
  );
}
