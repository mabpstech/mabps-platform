"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/ai", label: "Overview" },
  { href: "/ai/chat", label: "Chat" },
  { href: "/ai/prompts", label: "Prompts" },
  { href: "/ai/settings", label: "Settings" },
  { href: "/ai/tools", label: "Tools" },
  { href: "/ai/logs", label: "Logs" },
  { href: "/ai/usage", label: "Usage" },
] as const;

export function AiSubnav() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 space-y-4 sm:w-52">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          AI Assistant
        </p>
        <h2 className="mt-1 text-sm font-semibold text-zinc-900">
          Workspace AI
        </h2>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
        {LINKS.map((link) => {
          const active =
            link.href === "/ai"
              ? pathname === "/ai"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
