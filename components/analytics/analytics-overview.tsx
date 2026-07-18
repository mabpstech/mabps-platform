"use client";

import Link from "next/link";
import { Suspense } from "react";
import {
  AnalyticsBarChart,
  AnalyticsLineChart,
  formatMetricValue,
} from "@/components/analytics/charts";
import { MetricGrid } from "@/components/analytics/metric-grid";
import { RangeExportBar } from "@/components/analytics/range-export-bar";
import type { AnalyticsOverview } from "@/lib/analytics/types";

export function AnalyticsOverviewPanel({
  overview,
}: {
  overview: AnalyticsOverview;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Multi-tenant dashboard for revenue, website, chatbot, CRM,
          automation, activity, AI, and API usage.
        </p>
      </div>

      <Suspense fallback={null}>
        <RangeExportBar report="overview" currentRange={overview.range} />
      </Suspense>

      <MetricGrid cards={overview.cards} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Activity</h2>
          <p className="mt-1 text-xs text-zinc-500">Tracked workspace events</p>
          <div className="mt-4">
            <AnalyticsLineChart series={overview.series.activity} />
          </div>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Revenue</h2>
          <p className="mt-1 text-xs text-zinc-500">Paid invoice amounts</p>
          <div className="mt-4">
            <AnalyticsBarChart
              series={overview.series.revenue}
              format="currency"
            />
          </div>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Chat messages</h2>
          <div className="mt-4">
            <AnalyticsBarChart series={overview.series.messages} />
          </div>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Form submissions
          </h2>
          <div className="mt-4">
            <AnalyticsBarChart series={overview.series.formSubmissions} />
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: "/analytics/crm",
            title: "CRM",
            body: `${overview.modules.crm.leads} leads · ${overview.modules.crm.openDeals} open deals · ${formatMetricValue(overview.modules.crm.openDealValueCents, "currency")}`,
          },
          {
            href: "/analytics/chatbot",
            title: "Chatbot",
            body: `${overview.modules.chatbot.conversations} conversations · ${overview.modules.chatbot.messages} messages`,
          },
          {
            href: "/analytics/website",
            title: "Website",
            body: `${overview.modules.website.sites} sites · ${overview.modules.website.formSubmissions} submissions`,
          },
          {
            href: "/analytics/automation",
            title: "Automation",
            body: `${overview.modules.automation.activeWorkflows} active · ${overview.modules.automation.runsSucceeded} succeeded`,
          },
          {
            href: "/analytics/revenue",
            title: "Billing",
            body: `Plan ${overview.modules.billing.planId} · ${formatMetricValue(overview.modules.billing.amountPaidCents, "currency")} paid`,
          },
          {
            href: "/analytics/ai",
            title: "AI usage",
            body: `${overview.modules.billing.aiCredits} credits this period`,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
            <p className="mt-1 text-sm text-zinc-500">{item.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
