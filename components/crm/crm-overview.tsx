"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/components/crm/format";
import {
  authInputClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { CrmOverviewStats } from "@/lib/crm/types";

export function CrmOverview({ stats }: { stats: CrmOverviewStats }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{
    companies: Array<{ id: string; name: string }>;
    contacts: Array<{ id: string; firstName: string; lastName: string }>;
    leads: Array<{ id: string; firstName: string; lastName: string }>;
    customers: Array<{ id: string; displayName: string }>;
    deals: Array<{ id: string; title: string }>;
  } | null>(null);
  const [searching, setSearching] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(
        `/api/crm/search?q=${encodeURIComponent(q.trim())}`,
      );
      const data = (await response.json()) as {
        results?: typeof results;
      };
      setResults(data.results || null);
    } finally {
      setSearching(false);
    }
  }

  const cards = [
    { label: "Customers", value: stats.customers, href: "/crm/customers" },
    { label: "Leads", value: stats.leads, href: "/crm/leads" },
    { label: "Contacts", value: stats.contacts, href: "/crm/contacts" },
    { label: "Companies", value: stats.companies, href: "/crm/companies" },
    { label: "Open deals", value: stats.openDeals, href: "/crm/pipeline" },
    {
      label: "Pipeline value",
      value: formatMoney(stats.openDealValueCents),
      href: "/crm/deals",
    },
    { label: "Open tasks", value: stats.openTasks, href: "/crm/tasks" },
    {
      label: "Overdue tasks",
      value: stats.overdueTasks,
      href: "/crm/tasks?status=open",
    },
    {
      label: "Activities (7d)",
      value: stats.activitiesThisWeek,
      href: "/crm/activities",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          CRM
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage customers, leads, contacts, companies, deals, and the sales
          pipeline for this workspace.
        </p>
      </div>

      <form onSubmit={search} className="flex flex-wrap gap-3">
        <input
          className={`${authInputClassName} max-w-md flex-1`}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search customers, leads, contacts, companies, deals…"
        />
        <button
          type="submit"
          className={`${authSecondaryButtonClassName} !w-auto px-4`}
          disabled={searching}
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {results ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-medium text-zinc-900">Search results</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(
              [
                ["Customers", results.customers.map((c) => ({ id: c.id, label: c.displayName, href: `/crm/customers/${c.id}` }))],
                ["Leads", results.leads.map((l) => ({ id: l.id, label: `${l.firstName} ${l.lastName}`.trim(), href: `/crm/leads/${l.id}` }))],
                ["Contacts", results.contacts.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}`.trim(), href: `/crm/contacts/${c.id}` }))],
                ["Companies", results.companies.map((c) => ({ id: c.id, label: c.name, href: `/crm/companies/${c.id}` }))],
                ["Deals", results.deals.map((d) => ({ id: d.id, label: d.title, href: `/crm/deals/${d.id}` }))],
              ] as const
            ).map(([title, items]) => (
              <div key={title}>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {title}
                </p>
                <ul className="mt-2 space-y-1">
                  {items.length === 0 ? (
                    <li className="text-sm text-zinc-500">No matches</li>
                  ) : (
                    items.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="text-sm text-zinc-800 hover:underline"
                          onClick={() => router.push(item.href)}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
          >
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {card.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
