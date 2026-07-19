"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/deployment", label: "Overview" },
  { href: "/deployment/projects", label: "Projects" },
  { href: "/deployment/domains", label: "Domains" },
  { href: "/deployment/history", label: "History" },
  { href: "/deployment/env", label: "Env vars" },
  { href: "/deployment/health", label: "Health" },
  { href: "/deployment/settings", label: "Settings" },
  { href: "/deployment/logs", label: "Logs" },
] as const;

export function DeploymentSubnav() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 space-y-4 sm:w-52">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Platform
        </p>
        <h2 className="mt-1 text-sm font-semibold text-zinc-900">
          Deployment
        </h2>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
        {LINKS.map((link) => {
          const active =
            link.href === "/deployment"
              ? pathname === "/deployment"
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
