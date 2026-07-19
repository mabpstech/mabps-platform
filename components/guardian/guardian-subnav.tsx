"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/guardian", label: "Overview" },
  { href: "/guardian/health", label: "Health" },
  { href: "/guardian/scans", label: "Scans" },
  { href: "/guardian/findings", label: "Findings" },
  { href: "/guardian/repairs", label: "Repairs" },
  { href: "/guardian/troubleshoot", label: "Troubleshoot" },
  { href: "/guardian/logs", label: "Logs" },
  { href: "/guardian/settings", label: "Settings" },
] as const;

export function GuardianSubnav() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 space-y-4 sm:w-52">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Platform
        </p>
        <h2 className="mt-1 text-sm font-semibold text-zinc-900">
          AI Guardian
        </h2>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
        {LINKS.map((link) => {
          const active =
            link.href === "/guardian"
              ? pathname === "/guardian"
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
