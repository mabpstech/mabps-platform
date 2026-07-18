"use client";

import { Suspense } from "react";
import {
  AnalyticsBarChart,
  AnalyticsBreakdownList,
  AnalyticsLineChart,
  formatMetricValue,
} from "@/components/analytics/charts";
import { MetricGrid } from "@/components/analytics/metric-grid";
import { RangeExportBar } from "@/components/analytics/range-export-bar";
import type {
  AiUsageAnalytics,
  ApiUsageAnalytics,
  AutomationAnalytics,
  ChatbotAnalytics,
  CrmAnalytics,
  RevenueAnalytics,
  UserActivityAnalytics,
  WebsiteAnalytics,
} from "@/lib/analytics/types";

function PanelShell({
  title,
  description,
  report,
  range,
  children,
}: {
  title: string;
  description: string;
  report:
    | "revenue"
    | "website"
    | "chatbot"
    | "crm"
    | "automation"
    | "activity"
    | "ai"
    | "api";
  range: RevenueAnalytics["range"];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      <Suspense fallback={null}>
        <RangeExportBar report={report} currentRange={range} />
      </Suspense>
      {children}
    </div>
  );
}

export function RevenueAnalyticsPanel({ data }: { data: RevenueAnalytics }) {
  return (
    <PanelShell
      title="Revenue analytics"
      description="Subscription plan, invoices, and usage entitlements for this workspace."
      report="revenue"
      range={data.range}
    >
      <MetricGrid
        cards={[
          {
            key: "paid",
            label: "Amount paid",
            value: data.amountPaidCents,
            format: "currency",
            series: data.series,
          },
          {
            key: "due",
            label: "Amount due",
            value: data.amountDueCents,
            format: "currency",
          },
          {
            key: "invoices",
            label: "Invoices",
            value: data.invoiceCount,
          },
          {
            key: "paidInvoices",
            label: "Paid invoices",
            value: data.paidInvoiceCount,
          },
          { key: "members", label: "Members", value: data.usage.members },
          {
            key: "aiCredits",
            label: "AI credits",
            value: data.usage.aiCredits,
          },
        ]}
      />
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Plan {data.planId} · {data.subscriptionStatus}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="pb-2 pr-4 font-medium">Invoice</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Paid</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-zinc-100">
                  <td className="py-2 pr-4 text-zinc-800">
                    {invoice.number || invoice.id.slice(0, 8)}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {invoice.status || "—"}
                  </td>
                  <td className="py-2 pr-4 text-zinc-800">
                    {formatMetricValue(invoice.amountPaid, "currency")}
                  </td>
                  <td className="py-2 text-zinc-500">
                    {(invoice.paidAt || invoice.createdAt).slice(0, 10)}
                  </td>
                </tr>
              ))}
              {!data.invoices.length ? (
                <tr>
                  <td colSpan={4} className="py-4 text-zinc-500">
                    No invoices in this range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </PanelShell>
  );
}

export function WebsiteAnalyticsPanel({ data }: { data: WebsiteAnalytics }) {
  return (
    <PanelShell
      title="Website analytics"
      description="Sites, pages, form submissions, and tracked page views."
      report="website"
      range={data.range}
    >
      <MetricGrid
        cards={[
          { key: "sites", label: "Sites", value: data.sites },
          {
            key: "published",
            label: "Published",
            value: data.publishedSites,
          },
          { key: "pages", label: "Pages", value: data.pages },
          {
            key: "submissions",
            label: "Form submissions",
            value: data.formSubmissions,
            series: data.submissionsSeries,
          },
          {
            key: "views",
            label: "Page views",
            value: data.pageViews,
            series: data.pageViewsSeries,
          },
          {
            key: "visitors",
            label: "Unique visitors",
            value: data.uniqueVisitors,
          },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Top pages
          </h2>
          <AnalyticsBreakdownList
            items={data.topPages.map((row) => ({
              label: row.path,
              value: row.views,
            }))}
          />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Top sites
          </h2>
          <AnalyticsBreakdownList
            items={data.topSites.map((row) => ({
              label: row.name,
              value: row.submissions + row.views,
            }))}
          />
        </section>
      </div>
    </PanelShell>
  );
}

export function ChatbotAnalyticsPanel({ data }: { data: ChatbotAnalytics }) {
  return (
    <PanelShell
      title="Chatbot analytics"
      description="Conversations, messages, channels, and handoffs."
      report="chatbot"
      range={data.range}
    >
      <MetricGrid
        cards={[
          { key: "bots", label: "Bots", value: data.bots },
          { key: "active", label: "Active bots", value: data.activeBots },
          {
            key: "conversations",
            label: "Conversations",
            value: data.conversationsInRange,
            series: data.conversationsSeries,
          },
          {
            key: "messages",
            label: "Messages",
            value: data.messagesInRange,
            series: data.messagesSeries,
          },
          {
            key: "handoffs",
            label: "Open handoffs",
            value: data.openHandoffs,
          },
          {
            key: "leads",
            label: "Leads captured",
            value: data.leadsCaptured,
          },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            By channel
          </h2>
          <AnalyticsBreakdownList
            items={data.byChannel.map((row) => ({
              label: row.channel,
              value: row.count,
            }))}
          />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">By role</h2>
          <AnalyticsBreakdownList
            items={data.byRole.map((row) => ({
              label: row.role,
              value: row.count,
            }))}
          />
        </section>
      </div>
    </PanelShell>
  );
}

export function CrmAnalyticsPanel({ data }: { data: CrmAnalytics }) {
  return (
    <PanelShell
      title="CRM analytics"
      description="Pipeline health, lead sources, and deal outcomes."
      report="crm"
      range={data.range}
    >
      <MetricGrid
        cards={[
          { key: "companies", label: "Companies", value: data.companies },
          { key: "contacts", label: "Contacts", value: data.contacts },
          { key: "leads", label: "Leads", value: data.leads },
          { key: "customers", label: "Customers", value: data.customers },
          {
            key: "openValue",
            label: "Open deal value",
            value: data.openDealValueCents,
            format: "currency",
          },
          {
            key: "wonValue",
            label: "Won deal value",
            value: data.wonDealValueCents,
            format: "currency",
            series: data.dealsSeries,
          },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Leads by status
          </h2>
          <AnalyticsBreakdownList
            items={data.leadsByStatus.map((row) => ({
              label: row.status,
              value: row.count,
            }))}
          />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Leads by source
          </h2>
          <AnalyticsBreakdownList
            items={data.leadsBySource.map((row) => ({
              label: row.source,
              value: row.count,
            }))}
          />
        </section>
      </div>
    </PanelShell>
  );
}

export function AutomationAnalyticsPanel({
  data,
}: {
  data: AutomationAnalytics;
}) {
  return (
    <PanelShell
      title="Automation analytics"
      description="Workflow volume, success rate, and trigger mix."
      report="automation"
      range={data.range}
    >
      <MetricGrid
        cards={[
          { key: "workflows", label: "Workflows", value: data.workflows },
          {
            key: "active",
            label: "Active workflows",
            value: data.activeWorkflows,
          },
          {
            key: "runs",
            label: "Runs in range",
            value: data.runsInRange,
            series: data.runsSeries,
          },
          {
            key: "succeeded",
            label: "Succeeded",
            value: data.runsSucceeded,
          },
          { key: "failed", label: "Failed", value: data.runsFailed },
          {
            key: "successRate",
            label: "Success rate",
            value: data.successRate,
            format: "percent",
          },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            By trigger
          </h2>
          <AnalyticsBreakdownList
            items={data.byTrigger.map((row) => ({
              label: row.triggerType,
              value: row.count,
            }))}
          />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            By status
          </h2>
          <AnalyticsBreakdownList
            items={data.byStatus.map((row) => ({
              label: row.status,
              value: row.count,
            }))}
          />
        </section>
      </div>
    </PanelShell>
  );
}

export function ActivityAnalyticsPanel({
  data,
}: {
  data: UserActivityAnalytics;
}) {
  return (
    <PanelShell
      title="User activity"
      description="Members, sessions, and tracked workspace events."
      report="activity"
      range={data.range}
    >
      <MetricGrid
        cards={[
          { key: "members", label: "Members", value: data.members },
          {
            key: "invites",
            label: "Pending invites",
            value: data.pendingInvitations,
          },
          {
            key: "events",
            label: "Events",
            value: data.eventsInRange,
            series: data.activitySeries,
          },
          {
            key: "sessions",
            label: "Active sessions",
            value: data.sessionsActive,
          },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            By source
          </h2>
          <AnalyticsBreakdownList
            items={data.bySource.map((row) => ({
              label: row.source,
              value: row.count,
            }))}
          />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Recent events
          </h2>
          <ul className="space-y-2 text-sm">
            {data.recentEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2"
              >
                <span className="text-zinc-800">
                  {event.source}/{event.name}
                </span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {event.occurredAt.slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
            {!data.recentEvents.length ? (
              <li className="text-zinc-500">No events yet.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </PanelShell>
  );
}

export function AiUsageAnalyticsPanel({ data }: { data: AiUsageAnalytics }) {
  return (
    <PanelShell
      title="AI usage analytics"
      description="Model calls, tokens, credits, and chatbot assistant volume."
      report="ai"
      range={data.range}
    >
      <MetricGrid
        cards={[
          { key: "requests", label: "AI requests", value: data.requests },
          {
            key: "tokens",
            label: "Total tokens",
            value: data.totalTokens,
            series: data.tokensSeries,
          },
          {
            key: "credits",
            label: "Tracked credits",
            value: data.credits,
            series: data.creditsSeries,
          },
          {
            key: "billing",
            label: "Billing AI credits",
            value: data.billingAiCredits,
          },
          {
            key: "assistant",
            label: "Assistant messages",
            value: data.chatbotAiMessages,
          },
          {
            key: "failures",
            label: "Failures",
            value: data.failureCount,
          },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            By provider
          </h2>
          <AnalyticsBreakdownList
            items={data.byProvider.map((row) => ({
              label: row.provider,
              value: row.requests,
            }))}
          />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">By model</h2>
          <AnalyticsBreakdownList
            items={data.byModel.map((row) => ({
              label: row.model,
              value: row.tokens,
            }))}
          />
        </section>
      </div>
    </PanelShell>
  );
}

export function ApiUsageAnalyticsPanel({ data }: { data: ApiUsageAnalytics }) {
  return (
    <PanelShell
      title="API usage analytics"
      description="Request volume, latency, errors, and top endpoints."
      report="api"
      range={data.range}
    >
      <MetricGrid
        cards={[
          {
            key: "requests",
            label: "Requests",
            value: data.requests,
            series: data.requestsSeries,
          },
          { key: "errors", label: "Errors", value: data.errorCount },
          {
            key: "success",
            label: "Success rate",
            value: data.successRate,
            format: "percent",
          },
          {
            key: "latency",
            label: "Avg duration",
            value: data.avgDurationMs,
            format: "duration",
          },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Top paths
          </h2>
          <AnalyticsBreakdownList
            items={data.topPaths.map((row) => ({
              label: `${row.path} (${row.avgDurationMs}ms)`,
              value: row.count,
            }))}
          />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            By method
          </h2>
          <AnalyticsBreakdownList
            items={data.byMethod.map((row) => ({
              label: row.method,
              value: row.count,
            }))}
          />
          <div className="mt-6">
            <AnalyticsLineChart series={data.requestsSeries} />
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
