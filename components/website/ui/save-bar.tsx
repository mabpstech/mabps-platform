"use client";

import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

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
      ? "Saving…"
      : state === "saved"
        ? "Saved ✓"
        : state === "dirty"
          ? "Unsaved changes"
          : state === "error"
            ? "Couldn’t save"
            : "All changes saved";

  const statusTone =
    state === "error"
      ? "text-red-600"
      : state === "dirty"
        ? "text-amber-700"
        : state === "saved"
          ? "text-emerald-700"
          : "text-zinc-500";

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
      <p className={`text-sm font-medium ${statusTone}`}>{status}</p>
      <button
        type="button"
        className={`${authButtonClassName} !w-auto min-w-[7.5rem] px-4`}
        onClick={onSave}
        disabled={disabled || state === "saving" || state === "idle"}
      >
        {state === "saving" ? "Saving…" : label}
      </button>
    </div>
  );
}

export function EditorHeaderActions({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export { authSecondaryButtonClassName };
