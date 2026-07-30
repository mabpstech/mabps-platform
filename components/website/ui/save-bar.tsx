"use client";

import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { SaveState } from "@/components/website/hooks/use-editor-persistence";

function StatusDot({ state }: { state: SaveState }) {
  const tone =
    state === "error" || state === "conflict"
      ? "bg-red-500"
      : state === "dirty"
        ? "bg-amber-500"
        : state === "saving" || state === "retrying"
          ? "bg-sky-500"
          : state === "saved"
            ? "bg-emerald-500"
            : "bg-zinc-300";

  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
      {state === "saving" || state === "retrying" ? (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
      ) : null}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${tone}`} />
    </span>
  );
}

function SaveSpinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SaveBar({
  state,
  onSave,
  onReload,
  disabled,
  label = "Save",
}: {
  state: SaveState;
  onSave: () => void;
  onReload?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const status =
    state === "saving"
      ? "Saving changes…"
      : state === "retrying"
        ? "Connection issue — retrying…"
        : state === "saved"
          ? "All changes saved"
          : state === "dirty"
            ? "Unsaved changes"
            : state === "conflict"
              ? "Edited in another tab — reload to continue"
              : state === "error"
                ? "Couldn’t save — retrying when possible"
                : "All changes saved";

  const statusTone =
    state === "error" || state === "conflict"
      ? "text-red-700"
      : state === "dirty"
        ? "text-amber-800"
        : state === "saved"
          ? "text-emerald-700"
          : state === "saving" || state === "retrying"
            ? "text-sky-800"
            : "text-zinc-500";

  const busy = state === "saving" || state === "retrying";

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2.5">
        <StatusDot state={state} />
        <p
          className={`truncate text-sm font-medium tracking-[-0.01em] ${statusTone}`}
          role={
            state === "error" || state === "conflict" ? "alert" : "status"
          }
          aria-live={
            state === "error" || state === "conflict" ? "assertive" : "polite"
          }
        >
          {status}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {state === "conflict" && onReload ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto min-w-[8rem] gap-2 px-4 py-2`}
            onClick={onReload}
          >
            Reload
          </button>
        ) : (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto min-w-[8rem] gap-2 px-4 py-2`}
            onClick={onSave}
            disabled={
              disabled || busy || state === "idle" || state === "conflict"
            }
          >
            {busy ? (
              <>
                <SaveSpinner />
                {state === "retrying" ? "Retrying…" : "Saving…"}
              </>
            ) : state === "error" ? (
              "Retry save"
            ) : (
              label
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function EditorHeaderActions({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {children}
    </div>
  );
}

export type { SaveState };
export { authSecondaryButtonClassName };
