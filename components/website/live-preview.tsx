"use client";

import { useState } from "react";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

const DEVICE_HEIGHT: Record<PreviewDevice, string> = {
  desktop: "640px",
  tablet: "700px",
  mobile: "700px",
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

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {title}
        </p>
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5">
          {(
            [
              ["desktop", "Desktop"],
              ["tablet", "Tablet"],
              ["mobile", "Mobile"],
            ] as const
          ).map(([id, label]) => (
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
              {label}
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
      <div className="flex justify-center overflow-x-auto p-4">
        <div
          className="shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-[width,height] duration-300 ease-in-out"
          style={{
            width: DEVICE_WIDTH[device],
            maxWidth: device === "desktop" ? "100%" : undefined,
            height: DEVICE_HEIGHT[device],
          }}
        >
          <iframe
            key={`${src}-${refreshToken}-${key}`}
            title={title}
            src={src}
            className="h-full w-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
