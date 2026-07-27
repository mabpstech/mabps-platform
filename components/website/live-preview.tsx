"use client";

import { useState } from "react";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_META: Record<
  PreviewDevice,
  { label: string; width: string; height: string; hint: string }
> = {
  desktop: {
    label: "Desktop",
    width: "100%",
    height: "640px",
    hint: "Wide screen layout",
  },
  tablet: {
    label: "Tablet",
    width: "768px",
    height: "700px",
    hint: "Tablet width",
  },
  mobile: {
    label: "Mobile",
    width: "390px",
    height: "740px",
    hint: "Phone layout",
  },
};

function DeviceIcon({ device }: { device: PreviewDevice }) {
  if (device === "mobile") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="8"
          y="3"
          width="8"
          height="18"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path d="M11 18h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  if (device === "tablet") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="5"
          y="3"
          width="14"
          height="18"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path d="M11 18h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function LivePreview({
  src,
  title = "Live preview",
  refreshToken = 0,
}: {
  src: string;
  title?: string;
  /** Bump after save so the iframe reloads the latest page. */
  refreshToken?: number;
}) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [key, setKey] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const meta = DEVICE_META[device];
  const frameKey = `${src}-${refreshToken}-${key}-${device}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-100 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/90 bg-white/95 px-3.5 py-2.5 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            {title}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{meta.hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl bg-zinc-100 p-0.5">
            {(Object.keys(DEVICE_META) as PreviewDevice[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setDevice(id);
                  setFrameLoaded(false);
                }}
                aria-pressed={device === id}
                aria-label={DEVICE_META[id].label}
                title={DEVICE_META[id].label}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium tracking-[-0.01em] transition duration-150 ${
                  device === id
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <DeviceIcon device={id} />
                <span className="hidden sm:inline">{DEVICE_META[id].label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setKey((current) => current + 1);
              setFrameLoaded(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M20 12a8 8 0 10-2.3 5.5" />
              <path d="M20 5v5h-5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      <div
        className={`relative flex justify-center overflow-x-auto p-4 ${
          device === "mobile"
            ? "bg-[linear-gradient(180deg,#e4e4e7_0%,#f4f4f5_40%,#e4e4e7_100%)]"
            : "bg-[radial-gradient(circle_at_top,#fafafa_0%,#f4f4f5_55%,#ececef_100%)]"
        }`}
      >
        {!frameLoaded ? (
          <div
            className="pointer-events-none absolute inset-4 z-10 animate-pulse rounded-xl bg-zinc-200/40"
            aria-hidden
          />
        ) : null}
        <div
          className={`relative shrink-0 overflow-hidden bg-white transition-[width,height,border-radius,box-shadow,opacity] duration-300 ease-out ${
            device === "mobile"
              ? "rounded-[1.75rem] border-[6px] border-zinc-900 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
              : device === "tablet"
                ? "rounded-2xl border border-zinc-300 shadow-md"
                : "rounded-xl border border-zinc-200 shadow-sm"
          } ${frameLoaded ? "opacity-100" : "opacity-70"}`}
          style={{
            width: meta.width,
            maxWidth: device === "desktop" ? "100%" : undefined,
            height: meta.height,
          }}
        >
          <iframe
            key={frameKey}
            title={`${title} (${meta.label})`}
            src={src}
            className="h-full w-full border-0 bg-white"
            onLoad={() => setFrameLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
}
