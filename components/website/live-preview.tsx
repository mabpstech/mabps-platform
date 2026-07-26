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
    hint: "Full width · ≥1024px",
  },
  tablet: {
    label: "Tablet",
    width: "768px",
    height: "700px",
    hint: "768×700 · sm breakpoint",
  },
  mobile: {
    label: "Mobile",
    width: "390px",
    height: "740px",
    hint: "390×740 · phone layout",
  },
};

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
  const meta = DEVICE_META[device];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {title}
          </p>
          <p className="text-[11px] text-zinc-500">{meta.hint}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5">
          {(Object.keys(DEVICE_META) as PreviewDevice[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setDevice(id)}
              aria-pressed={device === id}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                device === id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {DEVICE_META[id].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setKey((current) => current + 1)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          Refresh
        </button>
      </div>
      <div
        className={`flex justify-center overflow-x-auto p-4 ${
          device === "mobile" ? "bg-[linear-gradient(180deg,#e4e4e7_0%,#f4f4f5_40%,#e4e4e7_100%)]" : ""
        }`}
      >
        <div
          className={`shrink-0 overflow-hidden bg-white shadow-sm transition-[width,height,border-radius,box-shadow] duration-300 ease-in-out ${
            device === "mobile"
              ? "rounded-[1.75rem] border-[6px] border-zinc-900 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
              : device === "tablet"
                ? "rounded-2xl border border-zinc-300 shadow-md"
                : "rounded-xl border border-zinc-200"
          }`}
          style={{
            width: meta.width,
            maxWidth: device === "desktop" ? "100%" : undefined,
            height: meta.height,
          }}
        >
          <iframe
            key={`${src}-${refreshToken}-${key}-${device}`}
            title={`${title} (${meta.label})`}
            src={src}
            className="h-full w-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
