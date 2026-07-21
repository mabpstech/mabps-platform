"use client";

import { useMemo, useState } from "react";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { WebsiteMedia } from "@/lib/website/types";
import { previewUrl } from "@/components/website/media/media-helpers";

export function MediaEditorModal({
  siteId,
  item,
  onClose,
  onSaved,
}: {
  siteId: string;
  item: WebsiteMedia;
  onClose: () => void;
  onSaved: (media: WebsiteMedia) => void;
}) {
  const [rotate, setRotate] = useState<0 | 90 | 180 | 270>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [width, setWidth] = useState(item.width ?? 1200);
  const [height, setHeight] = useState(item.height ?? 800);
  const [lockAspect, setLockAspect] = useState(true);
  const [quality, setQuality] = useState(82);
  const [convertToWebp, setConvertToWebp] = useState(false);
  const [crop, setCrop] = useState({
    left: 0,
    top: 0,
    width: item.width ?? 100,
    height: item.height ?? 100,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspect = useMemo(() => {
    if (!item.width || !item.height) return 1;
    return item.width / item.height;
  }, [item.height, item.width]);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const flip =
        flipH && flipV
          ? "both"
          : flipH
            ? "horizontal"
            : flipV
              ? "vertical"
              : undefined;
      const response = await fetch(
        `/api/website/sites/${siteId}/media/${item.id}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rotate,
            flip,
            resize: { width, height, lockAspect },
            compressQuality: quality,
            convertToWebp,
            crop:
              crop.left ||
              crop.top ||
              crop.width !== (item.width ?? crop.width) ||
              crop.height !== (item.height ?? crop.height)
                ? crop
                : undefined,
            generateThumbnail: true,
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        media?: WebsiteMedia;
      };
      if (!response.ok || !data.media) {
        throw new Error(data.error || "Unable to edit image.");
      }
      onSaved(data.media);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to edit image.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        aria-label="Edit image"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Edit image</h3>
            <p className="text-xs text-zinc-500">
              Crop, rotate, flip, resize, compress, and convert to WebP
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-zinc-500 hover:text-zinc-900"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[1.2fr_1fr]">
          <div className="flex items-center justify-center bg-zinc-950 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl(item, "large")}
              alt=""
              className="max-h-80 max-w-full object-contain transition-transform"
              style={{
                transform: `rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
              }}
            />
          </div>

          <div className="space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                onClick={() =>
                  setRotate((current) =>
                    ((current + 90) % 360) as 0 | 90 | 180 | 270,
                  )
                }
              >
                Rotate 90°
              </button>
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                onClick={() => setFlipH((v) => !v)}
              >
                Flip H
              </button>
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs`}
                onClick={() => setFlipV((v) => !v)}
              >
                Flip V
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-zinc-600">
                Width
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  value={width}
                  onChange={(event) => {
                    const next = Number(event.target.value) || 1;
                    setWidth(next);
                    if (lockAspect) setHeight(Math.round(next / aspect));
                  }}
                />
              </label>
              <label className="text-xs text-zinc-600">
                Height
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  value={height}
                  onChange={(event) => {
                    const next = Number(event.target.value) || 1;
                    setHeight(next);
                    if (lockAspect) setWidth(Math.round(next * aspect));
                  }}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={(event) => setLockAspect(event.target.checked)}
              />
              Lock aspect ratio
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-zinc-600">
                Crop X
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  value={crop.left}
                  onChange={(event) =>
                    setCrop((c) => ({
                      ...c,
                      left: Number(event.target.value) || 0,
                    }))
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Crop Y
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  value={crop.top}
                  onChange={(event) =>
                    setCrop((c) => ({
                      ...c,
                      top: Number(event.target.value) || 0,
                    }))
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Crop W
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  value={crop.width}
                  onChange={(event) =>
                    setCrop((c) => ({
                      ...c,
                      width: Number(event.target.value) || 1,
                    }))
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Crop H
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  value={crop.height}
                  onChange={(event) =>
                    setCrop((c) => ({
                      ...c,
                      height: Number(event.target.value) || 1,
                    }))
                  }
                />
              </label>
            </div>

            <label className="block text-xs text-zinc-600">
              Compression quality ({quality})
              <input
                type="range"
                min={40}
                max={95}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={convertToWebp}
                onChange={(event) => setConvertToWebp(event.target.checked)}
              />
              Convert to WebP
            </label>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <button
            type="button"
            className={`${authSecondaryButtonClassName} !w-auto px-4`}
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            onClick={() => void save()}
            disabled={pending}
          >
            {pending ? "Saving…" : "Apply edits"}
          </button>
        </div>
      </div>
    </div>
  );
}
