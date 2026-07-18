"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/crm", label: "Overview" },
  { href: "/crm/customers", label: "Customers" },
  { href: "/crm/leads", label: "Leads" },
  { href: "/crm/contacts", label: "Contacts" },
  { href: "/crm/companies", label: "Companies" },
  { href: "/crm/pipeline", label: "Pipeline" },
  { href: "/crm/deals", label: "Deals" },
  { href: "/crm/tasks", label: "Tasks" },
  { href: "/crm/activities", label: "Activities" },
  { href: "/crm/tags", label: "Tags" },
  { href: "/crm/import-export", label: "Import / Export" },
] as const;

export function CrmSubnav() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 space-y-4 sm:w-52">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          CRM
        </p>
        <h2 className="mt-1 text-sm font-semibold text-zinc-900">
          Customer workspace
        </h2>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
        {LINKS.map((link) => {
          const active =
            link.href === "/crm"
              ? pathname === "/crm"
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
