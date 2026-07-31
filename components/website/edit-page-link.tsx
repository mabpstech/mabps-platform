"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authButtonClassName } from "@/lib/auth/styles";

export function EditPageLink({
  href,
  className,
  children = "Edit",
}: {
  href: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const busy = pending || isPending;

  return (
    <Link
      href={href}
      aria-busy={busy || undefined}
      className={
        className ?? `${authButtonClassName} !w-auto px-3 py-1.5 text-xs`
      }
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        setPending(true);
        startTransition(() => {
          router.push(href);
        });
      }}
    >
      {busy ? "Opening…" : children}
    </Link>
  );
}
