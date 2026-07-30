"use client";

import Link from "next/link";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        Workspace
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Something went wrong
      </h1>
      <p className="text-sm leading-relaxed text-zinc-500">
        {error.message?.trim() ||
          "This screen hit an unexpected error. You can try again or return to the dashboard."}
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-zinc-400">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className={`${authButtonClassName} !w-auto px-4`}
          onClick={() => reset()}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className={`${authSecondaryButtonClassName} !w-auto px-4 no-underline`}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
