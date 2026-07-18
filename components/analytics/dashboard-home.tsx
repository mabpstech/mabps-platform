"use client";

import Link from "next/link";
import {
  AnalyticsBarChart,
  formatMetricValue,
} from "@/components/analytics/charts";
import { MetricGrid } from "@/components/analytics/metric-grid";
import type { AnalyticsOverview } from "@/lib/analytics/types";

export function DashboardHome({
  workspaceName,
  workspaceSlug,
  userEmail,
  overview,
}: {
  workspaceName: string;
  workspaceSlug?: string | null;
  userEmail: string;
  overview: AnalyticsOverview;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Signed in as {userEmail}. Active workspace:{" "}
            <span className="font-medium text-zinc-800">{workspaceName}</span>
            {workspaceSlug ? (
              <span className="text-zinc-400"> ({workspaceSlug})</span>
            ) : null}
          </p>
        </div>
        <Link
          href="/analytics"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Open Analytics
        </Link>
      </div>

      <MetricGrid cards={overview.cards.slice(0, 6)} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Revenue trend</h2>
          <div className="mt-4">
            <AnalyticsBarChart
              series={overview.series.revenue}
              format="currency"
            />
          </div>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Chat message volume
          </h2>
          <div className="mt-4">
            <AnalyticsBarChart series={overview.series.messages} />
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatLink
          href="/analytics/crm"
          label="Open pipeline"
          value={formatMetricValue(
            overview.modules.crm.openDealValueCents,
            "currency",
          )}
        />
        <StatLink
          href="/analytics/chatbot"
          label="Conversations"
          value={String(overview.modules.chatbot.conversations)}
        />
        <StatLink
          href="/analytics/website"
          label="Form submissions"
          value={String(overview.modules.website.formSubmissions)}
        />
        <StatLink
          href="/analytics/automation"
          label="Automation successes"
          value={String(overview.modules.automation.runsSucceeded)}
        />
      </div>
    </div>
  );
}

function StatLink({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-zinc-900">{value}</p>
    </Link>
  );
}
