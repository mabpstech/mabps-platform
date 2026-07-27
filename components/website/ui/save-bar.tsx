"use client";

import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function StatusDot({ state }: { state: SaveState }) {
  const tone =
    state === "error"
      ? "bg-red-500"
      : state === "dirty"
        ? "bg-amber-500"
        : state === "saving"
          ? "bg-sky-500"
          : state === "saved"
            ? "bg-emerald-500"
            : "bg-zinc-300";

  return (
    <span
      className={`relative flex h-2 w-2 shrink-0 ${state === "saving" ? "" : ""}`}
      aria-hidden
    >
      {state === "saving" ? (
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
  disabled,
  label = "Save",
}: {
  state: SaveState;
  onSave: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const status =
    state === "saving"
      ? "Saving changes…"
      : state === "saved"
        ? "All changes saved"
        : state === "dirty"
          ? "Unsaved changes"
          : state === "error"
            ? "Couldn’t save — try again"
            : "All changes saved";

  const statusTone =
    state === "error"
      ? "text-red-700"
      : state === "dirty"
        ? "text-amber-800"
        : state === "saved"
          ? "text-emerald-700"
          : state === "saving"
            ? "text-sky-800"
            : "text-zinc-500";

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2.5">
        <StatusDot state={state} />
        <p
          className={`truncate text-sm font-medium tracking-[-0.01em] ${statusTone}`}
          aria-live="polite"
        >
          {status}
        </p>
      </div>
      <button
        type="button"
        className={`${authButtonClassName} !w-auto min-w-[8rem] gap-2 px-4 py-2`}
        onClick={onSave}
        disabled={disabled || state === "saving" || state === "idle"}
      >
        {state === "saving" ? (
          <>
            <SaveSpinner />
            Saving…
          </>
        ) : (
          label
        )}
      </button>
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

export { authSecondaryButtonClassName };
