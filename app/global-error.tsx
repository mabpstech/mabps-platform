"use client";

import Link from "next/link";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="m-0 bg-zinc-50 font-sans text-zinc-900 antialiased">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center gap-4 px-6 py-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            MABPS
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm leading-relaxed text-zinc-500">
            An unexpected error stopped this page from loading. You can try again
            or return home.
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
              href="/"
              className={`${authSecondaryButtonClassName} !w-auto px-4 no-underline`}
            >
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
