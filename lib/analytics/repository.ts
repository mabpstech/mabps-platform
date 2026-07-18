import { randomUUID } from "node:crypto";
import { daysForRange } from "@/lib/analytics/defaults";
import {
  buildCsvFromTables,
  buildSimplePdf,
  reportTitle,
  type ReportTable,
} from "@/lib/analytics/export";
import { migrateAnalyticsSchema } from "@/lib/analytics/migrate";
import type {
  AnalyticsAiUsage,
  AnalyticsApiRequest,
  AnalyticsDateRange,
  AnalyticsEvent,
  AnalyticsExportFormat,
  AnalyticsListFilters,
  AnalyticsOverview,
  AnalyticsReportId,
  ApiUsageAnalytics,
  AutomationAnalytics,
  AiUsageAnalytics,
  ChatbotAnalytics,
  CrmAnalytics,
  RevenueAnalytics,
  SeriesPoint,
  TrackAiUsageInput,
  TrackApiRequestInput,
  TrackEventInput,
  UserActivityAnalytics,
  WebsiteAnalytics,
} from "@/lib/analytics/types";
import { ensureAutomationReady } from "@/lib/automation/repository";
import {
  countPendingInvitations,
  countWorkspaceMembers,
  ensureBillingReady,
  ensureFreeSubscription,
  listInvoicesForWorkspace,
} from "@/lib/billing/repository";
import { getWorkspaceUsage } from "@/lib/billing/entitlements";
import { ensureChatbotReady } from "@/lib/chatbot/repository";
import { ensureCrmReady } from "@/lib/crm/repository";
import { sqlite } from "@/lib/db";
import { ensureWebsiteReady } from "@/lib/website/repository";

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function tableExists(table: string): boolean {
  const row = sqlite
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(table) as { name: string } | undefined;
  return Boolean(row);
}

function safeCount(
  sql: string,
  params: Array<string | number> = [],
): number {
  try {
    const row = sqlite.prepare(sql).get(...params) as
      | { count?: number; c?: number }
      | undefined;
    return Number(row?.count ?? row?.c ?? 0);
  } catch {
    return 0;
  }
}

export function ensureAnalyticsReady(): void {
  migrateAnalyticsSchema();
}

function resolveRange(range: AnalyticsDateRange): {
  from: string | null;
  to: string;
} {
  const to = nowIso();
  const days = daysForRange(range);
  if (days === null) return { from: null, to };
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

function emptySeries(from: string | null, to: string, days = 30): SeriesPoint[] {
  const end = new Date(to);
  const start = from
    ? new Date(from)
    : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const points: SeriesPoint[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const endDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  while (cursor <= endDay) {
    points.push({ date: cursor.toISOString().slice(0, 10), value: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

function mergeSeries(
  base: SeriesPoint[],
  rows: Array<{ date: string; value: number }>,
): SeriesPoint[] {
  const map = new Map(base.map((point) => [point.date, point.value]));
  for (const row of rows) {
    map.set(row.date, Number(row.value ?? 0));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

function dailyCounts(
  sql: string,
  params: Array<string | number>,
  from: string | null,
  to: string,
): SeriesPoint[] {
  const base = emptySeries(from, to);
  try {
    const rows = sqlite.prepare(sql).all(...params) as Array<{
      date: string;
      value: number;
    }>;
    return mergeSeries(
      base,
      rows.map((row) => ({
        date: String(row.date).slice(0, 10),
        value: Number(row.value ?? 0),
      })),
    );
  } catch {
    return base;
  }
}

function rowToEvent(row: Record<string, unknown>): AnalyticsEvent {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    source: row.source as AnalyticsEvent["source"],
    name: String(row.name),
    entityType: asStringOrNull(row.entityType),
    entityId: asStringOrNull(row.entityId),
    userId: asStringOrNull(row.userId),
    value: row.value === null || row.value === undefined ? null : Number(row.value),
    unit: asStringOrNull(row.unit),
    properties: parseJson(row.propertiesJson, {}),
    occurredAt: String(row.occurredAt),
    createdAt: String(row.createdAt),
  };
}

function rowToApiRequest(row: Record<string, unknown>): AnalyticsApiRequest {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    method: String(row.method),
    path: String(row.path),
    statusCode: Number(row.statusCode),
    durationMs:
      row.durationMs === null || row.durationMs === undefined
        ? null
        : Number(row.durationMs),
    userId: asStringOrNull(row.userId),
    ipHash: asStringOrNull(row.ipHash),
    userAgent: asStringOrNull(row.userAgent),
    occurredAt: String(row.occurredAt),
    createdAt: String(row.createdAt),
  };
}

function rowToAiUsage(row: Record<string, unknown>): AnalyticsAiUsage {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    provider: String(row.provider),
    model: String(row.model),
    operation: String(row.operation),
    inputTokens: Number(row.inputTokens ?? 0),
    outputTokens: Number(row.outputTokens ?? 0),
    totalTokens: Number(row.totalTokens ?? 0),
    credits: Number(row.credits ?? 0),
    success: Number(row.success) === 1,
    entityType: asStringOrNull(row.entityType),
    entityId: asStringOrNull(row.entityId),
    userId: asStringOrNull(row.userId),
    metadata: parseJson(row.metadataJson, {}),
    occurredAt: String(row.occurredAt),
    createdAt: String(row.createdAt),
  };
}

export function trackEvent(input: TrackEventInput): AnalyticsEvent {
  ensureAnalyticsReady();
  const timestamp = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "analytics_event" (
        "id", "workspaceId", "source", "name", "entityType", "entityId",
        "userId", "value", "unit", "propertiesJson", "occurredAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.source,
      input.name,
      input.entityType ?? null,
      input.entityId ?? null,
      input.userId ?? null,
      input.value ?? null,
      input.unit ?? null,
      JSON.stringify(input.properties ?? {}),
      input.occurredAt ?? timestamp,
      timestamp,
    );

  return getEventById(input.workspaceId, id)!;
}

export function trackApiRequest(
  input: TrackApiRequestInput,
): AnalyticsApiRequest {
  ensureAnalyticsReady();
  const timestamp = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "analytics_api_request" (
        "id", "workspaceId", "method", "path", "statusCode", "durationMs",
        "userId", "ipHash", "userAgent", "occurredAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.method.toUpperCase(),
      input.path,
      input.statusCode,
      input.durationMs ?? null,
      input.userId ?? null,
      input.ipHash ?? null,
      input.userAgent ?? null,
      input.occurredAt ?? timestamp,
      timestamp,
    );

  const row = sqlite
    .prepare(
      `SELECT * FROM "analytics_api_request" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(id, input.workspaceId) as Record<string, unknown>;
  return rowToApiRequest(row);
}

export function trackAiUsage(input: TrackAiUsageInput): AnalyticsAiUsage {
  ensureAnalyticsReady();
  const timestamp = nowIso();
  const id = randomUUID();
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const totalTokens = input.totalTokens ?? inputTokens + outputTokens;
  sqlite
    .prepare(
      `INSERT INTO "analytics_ai_usage" (
        "id", "workspaceId", "provider", "model", "operation",
        "inputTokens", "outputTokens", "totalTokens", "credits", "success",
        "entityType", "entityId", "userId", "metadataJson", "occurredAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.provider,
      input.model,
      input.operation ?? "chat",
      inputTokens,
      outputTokens,
      totalTokens,
      input.credits ?? 0,
      input.success === false ? 0 : 1,
      input.entityType ?? null,
      input.entityId ?? null,
      input.userId ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.occurredAt ?? timestamp,
      timestamp,
    );

  const row = sqlite
    .prepare(
      `SELECT * FROM "analytics_ai_usage" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(id, input.workspaceId) as Record<string, unknown>;
  return rowToAiUsage(row);
}

export function getEventById(
  workspaceId: string,
  eventId: string,
): AnalyticsEvent | null {
  ensureAnalyticsReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "analytics_event" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(eventId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToEvent(row) : null;
}

export function listEvents(
  workspaceId: string,
  filters: AnalyticsListFilters = {},
): AnalyticsEvent[] {
  ensureAnalyticsReady();
  const clauses = [`"workspaceId" = ?`];
  const params: Array<string | number> = [workspaceId];

  if (filters.source) {
    clauses.push(`"source" = ?`);
    params.push(filters.source);
  }
  if (filters.name) {
    clauses.push(`"name" = ?`);
    params.push(filters.name);
  }
  if (filters.userId) {
    clauses.push(`"userId" = ?`);
    params.push(filters.userId);
  }
  if (filters.from) {
    clauses.push(`"occurredAt" >= ?`);
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push(`"occurredAt" <= ?`);
    params.push(filters.to);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "analytics_event"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "occurredAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToEvent);
}

export function getAnalyticsOverview(
  workspaceId: string,
  range: AnalyticsDateRange = "30d",
): AnalyticsOverview {
  ensureAnalyticsReady();
  ensureBillingReady();
  ensureCrmReady();
  ensureChatbotReady();
  ensureWebsiteReady();
  ensureAutomationReady();

  const { from, to } = resolveRange(range);
  const usage = getWorkspaceUsage(workspaceId);
  const subscription = ensureFreeSubscription(workspaceId);
  const invoices = listInvoicesForWorkspace(workspaceId, 100);
  const amountPaidCents = invoices.reduce(
    (sum, invoice) => sum + (invoice.amountPaid ?? 0),
    0,
  );

  const crmLeads = safeCount(
    `SELECT COUNT(*) as count FROM "crm_lead" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const openDeals = sqlite
    .prepare(
      `SELECT COUNT(*) as count, COALESCE(SUM("amountCents"), 0) as total
       FROM "crm_deal" WHERE "workspaceId" = ? AND "status" = 'open'`,
    )
    .get(workspaceId) as { count: number; total: number } | undefined;

  const conversations = safeCount(
    `SELECT COUNT(*) as count FROM "chatbot_conversation" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const messages = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "chatbot_message" m
         JOIN "chatbot_conversation" c ON c."id" = m."conversationId"
         WHERE c."workspaceId" = ? AND m."createdAt" >= ?`,
        [workspaceId, from],
      )
    : safeCount(
        `SELECT COUNT(*) as count FROM "chatbot_message" m
         JOIN "chatbot_conversation" c ON c."id" = m."conversationId"
         WHERE c."workspaceId" = ?`,
        [workspaceId],
      );
  const openHandoffs = safeCount(
    `SELECT COUNT(*) as count FROM "chatbot_handoff"
     WHERE "workspaceId" = ? AND "status" IN ('requested', 'claimed')`,
    [workspaceId],
  );

  const sites = safeCount(
    `SELECT COUNT(*) as count FROM "website_site" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const pages = safeCount(
    `SELECT COUNT(*) as count FROM "website_page" p
     JOIN "website_site" s ON s."id" = p."siteId"
     WHERE s."workspaceId" = ?`,
    [workspaceId],
  );
  const formSubmissions = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "website_form_submission" fs
         JOIN "website_site" s ON s."id" = fs."siteId"
         WHERE s."workspaceId" = ? AND fs."createdAt" >= ?`,
        [workspaceId, from],
      )
    : safeCount(
        `SELECT COUNT(*) as count FROM "website_form_submission" fs
         JOIN "website_site" s ON s."id" = fs."siteId"
         WHERE s."workspaceId" = ?`,
        [workspaceId],
      );

  const activeWorkflows = safeCount(
    `SELECT COUNT(*) as count FROM "automation_workflow"
     WHERE "workspaceId" = ? AND "status" = 'active'`,
    [workspaceId],
  );
  const runsSucceeded = safeCount(
    `SELECT COUNT(*) as count FROM "automation_run"
     WHERE "workspaceId" = ? AND "status" = 'succeeded'${from ? ` AND "createdAt" >= ?` : ""}`,
    from ? [workspaceId, from] : [workspaceId],
  );
  const runsFailed = safeCount(
    `SELECT COUNT(*) as count FROM "automation_run"
     WHERE "workspaceId" = ? AND "status" = 'failed'${from ? ` AND "createdAt" >= ?` : ""}`,
    from ? [workspaceId, from] : [workspaceId],
  );

  const pageViews = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "analytics_event"
         WHERE "workspaceId" = ? AND "source" = 'website' AND "name" = 'page_view'
           AND "occurredAt" >= ?`,
        [workspaceId, from],
      )
    : safeCount(
        `SELECT COUNT(*) as count FROM "analytics_event"
         WHERE "workspaceId" = ? AND "source" = 'website' AND "name" = 'page_view'`,
        [workspaceId],
      );

  const activitySeries = dailyCounts(
    `SELECT substr("occurredAt", 1, 10) as date, COUNT(*) as value
     FROM "analytics_event"
     WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
     GROUP BY substr("occurredAt", 1, 10)
     ORDER BY date`,
    from ? [workspaceId, from] : [workspaceId],
    from,
    to,
  );

  const revenueSeries = dailyCounts(
    `SELECT substr(COALESCE("paidAt", "createdAt"), 1, 10) as date,
            COALESCE(SUM("amountPaid"), 0) as value
     FROM "invoice"
     WHERE "workspaceId" = ?${from ? ` AND COALESCE("paidAt", "createdAt") >= ?` : ""}
     GROUP BY substr(COALESCE("paidAt", "createdAt"), 1, 10)
     ORDER BY date`,
    from ? [workspaceId, from] : [workspaceId],
    from,
    to,
  );

  const messagesSeries = dailyCounts(
    `SELECT substr(m."createdAt", 1, 10) as date, COUNT(*) as value
     FROM "chatbot_message" m
     JOIN "chatbot_conversation" c ON c."id" = m."conversationId"
     WHERE c."workspaceId" = ?${from ? ` AND m."createdAt" >= ?` : ""}
     GROUP BY substr(m."createdAt", 1, 10)
     ORDER BY date`,
    from ? [workspaceId, from] : [workspaceId],
    from,
    to,
  );

  const submissionsSeries = dailyCounts(
    `SELECT substr(fs."createdAt", 1, 10) as date, COUNT(*) as value
     FROM "website_form_submission" fs
     JOIN "website_site" s ON s."id" = fs."siteId"
     WHERE s."workspaceId" = ?${from ? ` AND fs."createdAt" >= ?` : ""}
     GROUP BY substr(fs."createdAt", 1, 10)
     ORDER BY date`,
    from ? [workspaceId, from] : [workspaceId],
    from,
    to,
  );

  return {
    range,
    from,
    to,
    cards: [
      {
        key: "revenue",
        label: "Revenue paid",
        value: amountPaidCents,
        format: "currency",
        series: revenueSeries,
      },
      {
        key: "pageViews",
        label: "Page views",
        value: pageViews,
        format: "number",
      },
      {
        key: "messages",
        label: "Chat messages",
        value: messages,
        format: "number",
        series: messagesSeries,
      },
      {
        key: "leads",
        label: "CRM leads",
        value: crmLeads,
        format: "number",
      },
      {
        key: "automations",
        label: "Automation successes",
        value: runsSucceeded,
        format: "number",
      },
      {
        key: "aiCredits",
        label: "AI credits used",
        value: usage.aiCredits,
        format: "number",
      },
    ],
    series: {
      activity: activitySeries,
      revenue: revenueSeries,
      messages: messagesSeries,
      formSubmissions: submissionsSeries,
    },
    modules: {
      crm: {
        leads: crmLeads,
        openDeals: Number(openDeals?.count ?? 0),
        openDealValueCents: Number(openDeals?.total ?? 0),
      },
      chatbot: {
        conversations,
        messages,
        openHandoffs,
      },
      website: {
        sites,
        pages,
        formSubmissions,
      },
      automation: {
        activeWorkflows,
        runsSucceeded,
        runsFailed,
      },
      billing: {
        planId: subscription.planId,
        amountPaidCents,
        aiCredits: usage.aiCredits,
      },
    },
  };
}

export function getRevenueAnalytics(
  workspaceId: string,
  range: AnalyticsDateRange = "30d",
): RevenueAnalytics {
  ensureAnalyticsReady();
  ensureBillingReady();
  const { from, to } = resolveRange(range);
  const subscription = ensureFreeSubscription(workspaceId);
  const usage = getWorkspaceUsage(workspaceId);
  const invoices = listInvoicesForWorkspace(workspaceId, 200).filter(
    (invoice) => !from || invoice.createdAt >= from || (invoice.paidAt ?? "") >= from,
  );

  const amountDueCents = invoices.reduce(
    (sum, invoice) => sum + (invoice.amountDue ?? 0),
    0,
  );
  const amountPaidCents = invoices.reduce(
    (sum, invoice) => sum + (invoice.amountPaid ?? 0),
    0,
  );

  return {
    range,
    from,
    to,
    planId: subscription.planId,
    subscriptionStatus: subscription.status,
    amountDueCents,
    amountPaidCents,
    invoiceCount: invoices.length,
    paidInvoiceCount: invoices.filter(
      (invoice) => invoice.status === "paid" || invoice.amountPaid > 0,
    ).length,
    series: dailyCounts(
      `SELECT substr(COALESCE("paidAt", "createdAt"), 1, 10) as date,
              COALESCE(SUM("amountPaid"), 0) as value
       FROM "invoice"
       WHERE "workspaceId" = ?${from ? ` AND COALESCE("paidAt", "createdAt") >= ?` : ""}
       GROUP BY substr(COALESCE("paidAt", "createdAt"), 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    invoices: invoices.slice(0, 50).map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountDue: invoice.amountDue,
      amountPaid: invoice.amountPaid,
      currency: invoice.currency,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
    })),
    usage,
  };
}

export function getWebsiteAnalytics(
  workspaceId: string,
  range: AnalyticsDateRange = "30d",
): WebsiteAnalytics {
  ensureAnalyticsReady();
  ensureWebsiteReady();
  const { from, to } = resolveRange(range);

  const sites = safeCount(
    `SELECT COUNT(*) as count FROM "website_site" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const publishedSites = safeCount(
    `SELECT COUNT(*) as count FROM "website_site"
     WHERE "workspaceId" = ? AND "status" = 'published'`,
    [workspaceId],
  );
  const pages = safeCount(
    `SELECT COUNT(*) as count FROM "website_page" p
     JOIN "website_site" s ON s."id" = p."siteId"
     WHERE s."workspaceId" = ?`,
    [workspaceId],
  );
  const blogPosts = safeCount(
    `SELECT COUNT(*) as count FROM "website_blog_post" b
     JOIN "website_site" s ON s."id" = b."siteId"
     WHERE s."workspaceId" = ?`,
    [workspaceId],
  );
  const forms = safeCount(
    `SELECT COUNT(*) as count FROM "website_form" f
     JOIN "website_site" s ON s."id" = f."siteId"
     WHERE s."workspaceId" = ?`,
    [workspaceId],
  );
  const formSubmissions = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "website_form_submission" fs
         JOIN "website_site" s ON s."id" = fs."siteId"
         WHERE s."workspaceId" = ? AND fs."createdAt" >= ?`,
        [workspaceId, from],
      )
    : safeCount(
        `SELECT COUNT(*) as count FROM "website_form_submission" fs
         JOIN "website_site" s ON s."id" = fs."siteId"
         WHERE s."workspaceId" = ?`,
        [workspaceId],
      );

  const pageViews = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "analytics_event"
         WHERE "workspaceId" = ? AND "source" = 'website' AND "name" = 'page_view'
           AND "occurredAt" >= ?`,
        [workspaceId, from],
      )
    : safeCount(
        `SELECT COUNT(*) as count FROM "analytics_event"
         WHERE "workspaceId" = ? AND "source" = 'website' AND "name" = 'page_view'`,
        [workspaceId],
      );

  const uniqueVisitors = from
    ? safeCount(
        `SELECT COUNT(DISTINCT json_extract("propertiesJson", '$.visitorId')) as count
         FROM "analytics_event"
         WHERE "workspaceId" = ? AND "source" = 'website' AND "name" = 'page_view'
           AND "occurredAt" >= ?
           AND json_extract("propertiesJson", '$.visitorId') IS NOT NULL`,
        [workspaceId, from],
      )
    : safeCount(
        `SELECT COUNT(DISTINCT json_extract("propertiesJson", '$.visitorId')) as count
         FROM "analytics_event"
         WHERE "workspaceId" = ? AND "source" = 'website' AND "name" = 'page_view'
           AND json_extract("propertiesJson", '$.visitorId') IS NOT NULL`,
        [workspaceId],
      );

  let topPages: WebsiteAnalytics["topPages"] = [];
  try {
    topPages = (
      sqlite
        .prepare(
          `SELECT COALESCE(json_extract("propertiesJson", '$.path'), 'unknown') as path,
                  COUNT(*) as views
           FROM "analytics_event"
           WHERE "workspaceId" = ? AND "source" = 'website' AND "name" = 'page_view'
             ${from ? `AND "occurredAt" >= ?` : ""}
           GROUP BY path
           ORDER BY views DESC
           LIMIT 10`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        path: string;
        views: number;
      }>
    ).map((row) => ({ path: row.path, views: Number(row.views) }));
  } catch {
    topPages = [];
  }

  let topSites: WebsiteAnalytics["topSites"] = [];
  try {
    const siteRows = sqlite
      .prepare(
        `SELECT s."id" as siteId, s."name" as name,
                (SELECT COUNT(*) FROM "website_form_submission" fs
                 WHERE fs."siteId" = s."id"${from ? ` AND fs."createdAt" >= ?` : ""}) as submissions,
                (SELECT COUNT(*) FROM "analytics_event" e
                 WHERE e."workspaceId" = s."workspaceId"
                   AND e."source" = 'website' AND e."name" = 'page_view'
                   AND json_extract(e."propertiesJson", '$.siteId') = s."id"
                   ${from ? `AND e."occurredAt" >= ?` : ""}) as views
         FROM "website_site" s
         WHERE s."workspaceId" = ?
         ORDER BY submissions DESC, views DESC
         LIMIT 10`,
      )
      .all(
        ...(from
          ? [from, from, workspaceId]
          : [workspaceId]),
      ) as Array<{
      siteId: string;
      name: string;
      submissions: number;
      views: number;
    }>;
    topSites = siteRows.map((row) => ({
      siteId: row.siteId,
      name: row.name,
      submissions: Number(row.submissions),
      views: Number(row.views),
    }));
  } catch {
    topSites = [];
  }

  return {
    range,
    from,
    to,
    sites,
    publishedSites,
    pages,
    blogPosts,
    forms,
    formSubmissions,
    pageViews,
    uniqueVisitors,
    submissionsSeries: dailyCounts(
      `SELECT substr(fs."createdAt", 1, 10) as date, COUNT(*) as value
       FROM "website_form_submission" fs
       JOIN "website_site" s ON s."id" = fs."siteId"
       WHERE s."workspaceId" = ?${from ? ` AND fs."createdAt" >= ?` : ""}
       GROUP BY substr(fs."createdAt", 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    pageViewsSeries: dailyCounts(
      `SELECT substr("occurredAt", 1, 10) as date, COUNT(*) as value
       FROM "analytics_event"
       WHERE "workspaceId" = ? AND "source" = 'website' AND "name" = 'page_view'
         ${from ? `AND "occurredAt" >= ?` : ""}
       GROUP BY substr("occurredAt", 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    topPages,
    topSites,
  };
}

export function getChatbotAnalytics(
  workspaceId: string,
  range: AnalyticsDateRange = "30d",
): ChatbotAnalytics {
  ensureAnalyticsReady();
  ensureChatbotReady();
  const { from, to } = resolveRange(range);

  const bots = safeCount(
    `SELECT COUNT(*) as count FROM "chatbot_bot" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const activeBots = safeCount(
    `SELECT COUNT(*) as count FROM "chatbot_bot"
     WHERE "workspaceId" = ? AND "status" = 'active'`,
    [workspaceId],
  );
  const conversations = safeCount(
    `SELECT COUNT(*) as count FROM "chatbot_conversation" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const conversationsInRange = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "chatbot_conversation"
         WHERE "workspaceId" = ? AND "createdAt" >= ?`,
        [workspaceId, from],
      )
    : conversations;
  const messages = safeCount(
    `SELECT COUNT(*) as count FROM "chatbot_message" m
     JOIN "chatbot_conversation" c ON c."id" = m."conversationId"
     WHERE c."workspaceId" = ?`,
    [workspaceId],
  );
  const messagesInRange = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "chatbot_message" m
         JOIN "chatbot_conversation" c ON c."id" = m."conversationId"
         WHERE c."workspaceId" = ? AND m."createdAt" >= ?`,
        [workspaceId, from],
      )
    : messages;
  const openHandoffs = safeCount(
    `SELECT COUNT(*) as count FROM "chatbot_handoff"
     WHERE "workspaceId" = ? AND "status" IN ('requested', 'claimed')`,
    [workspaceId],
  );
  const leadsCaptured = safeCount(
    `SELECT COUNT(*) as count FROM "chatbot_conversation"
     WHERE "workspaceId" = ? AND "crmLeadId" IS NOT NULL`,
    [workspaceId],
  );

  let byChannel: ChatbotAnalytics["byChannel"] = [];
  let byRole: ChatbotAnalytics["byRole"] = [];
  try {
    byChannel = (
      sqlite
        .prepare(
          `SELECT "channel" as channel, COUNT(*) as count
           FROM "chatbot_conversation"
           WHERE "workspaceId" = ?${from ? ` AND "createdAt" >= ?` : ""}
           GROUP BY "channel"
           ORDER BY count DESC`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        channel: string;
        count: number;
      }>
    ).map((row) => ({ channel: row.channel, count: Number(row.count) }));

    byRole = (
      sqlite
        .prepare(
          `SELECT m."role" as role, COUNT(*) as count
           FROM "chatbot_message" m
           JOIN "chatbot_conversation" c ON c."id" = m."conversationId"
           WHERE c."workspaceId" = ?${from ? ` AND m."createdAt" >= ?` : ""}
           GROUP BY m."role"
           ORDER BY count DESC`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        role: string;
        count: number;
      }>
    ).map((row) => ({ role: row.role, count: Number(row.count) }));
  } catch {
    byChannel = [];
    byRole = [];
  }

  return {
    range,
    from,
    to,
    bots,
    activeBots,
    conversations,
    conversationsInRange,
    messages,
    messagesInRange,
    openHandoffs,
    leadsCaptured,
    messagesSeries: dailyCounts(
      `SELECT substr(m."createdAt", 1, 10) as date, COUNT(*) as value
       FROM "chatbot_message" m
       JOIN "chatbot_conversation" c ON c."id" = m."conversationId"
       WHERE c."workspaceId" = ?${from ? ` AND m."createdAt" >= ?` : ""}
       GROUP BY substr(m."createdAt", 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    conversationsSeries: dailyCounts(
      `SELECT substr("createdAt", 1, 10) as date, COUNT(*) as value
       FROM "chatbot_conversation"
       WHERE "workspaceId" = ?${from ? ` AND "createdAt" >= ?` : ""}
       GROUP BY substr("createdAt", 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    byChannel,
    byRole,
  };
}

export function getCrmAnalytics(
  workspaceId: string,
  range: AnalyticsDateRange = "30d",
): CrmAnalytics {
  ensureAnalyticsReady();
  ensureCrmReady();
  const { from, to } = resolveRange(range);
  const now = nowIso();

  const companies = safeCount(
    `SELECT COUNT(*) as count FROM "crm_company" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const contacts = safeCount(
    `SELECT COUNT(*) as count FROM "crm_contact" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const leads = safeCount(
    `SELECT COUNT(*) as count FROM "crm_lead" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const customers = safeCount(
    `SELECT COUNT(*) as count FROM "crm_customer" WHERE "workspaceId" = ?`,
    [workspaceId],
  );

  const openDealsRow = sqlite
    .prepare(
      `SELECT COUNT(*) as count, COALESCE(SUM("amountCents"), 0) as total
       FROM "crm_deal" WHERE "workspaceId" = ? AND "status" = 'open'`,
    )
    .get(workspaceId) as { count: number; total: number } | undefined;
  const wonDealsRow = sqlite
    .prepare(
      `SELECT COUNT(*) as count, COALESCE(SUM("amountCents"), 0) as total
       FROM "crm_deal" WHERE "workspaceId" = ? AND "status" = 'won'
         ${from ? `AND COALESCE("closedAt", "updatedAt") >= ?` : ""}`,
    )
    .get(...(from ? [workspaceId, from] : [workspaceId])) as
    | { count: number; total: number }
    | undefined;
  const lostDeals = safeCount(
    `SELECT COUNT(*) as count FROM "crm_deal"
     WHERE "workspaceId" = ? AND "status" = 'lost'
       ${from ? `AND COALESCE("closedAt", "updatedAt") >= ?` : ""}`,
    from ? [workspaceId, from] : [workspaceId],
  );
  const openTasks = safeCount(
    `SELECT COUNT(*) as count FROM "crm_task"
     WHERE "workspaceId" = ? AND "status" = 'open'`,
    [workspaceId],
  );
  const overdueTasks = safeCount(
    `SELECT COUNT(*) as count FROM "crm_task"
     WHERE "workspaceId" = ? AND "status" = 'open'
       AND "dueAt" IS NOT NULL AND "dueAt" < ?`,
    [workspaceId, now],
  );
  const activitiesInRange = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "crm_activity"
         WHERE "workspaceId" = ? AND "occurredAt" >= ?`,
        [workspaceId, from],
      )
    : safeCount(
        `SELECT COUNT(*) as count FROM "crm_activity" WHERE "workspaceId" = ?`,
        [workspaceId],
      );

  let leadsByStatus: CrmAnalytics["leadsByStatus"] = [];
  let leadsBySource: CrmAnalytics["leadsBySource"] = [];
  try {
    leadsByStatus = (
      sqlite
        .prepare(
          `SELECT "status" as status, COUNT(*) as count
           FROM "crm_lead" WHERE "workspaceId" = ?
           GROUP BY "status" ORDER BY count DESC`,
        )
        .all(workspaceId) as Array<{ status: string; count: number }>
    ).map((row) => ({ status: row.status, count: Number(row.count) }));

    leadsBySource = (
      sqlite
        .prepare(
          `SELECT COALESCE("source", 'unknown') as source, COUNT(*) as count
           FROM "crm_lead" WHERE "workspaceId" = ?
           GROUP BY source ORDER BY count DESC`,
        )
        .all(workspaceId) as Array<{ source: string; count: number }>
    ).map((row) => ({ source: row.source, count: Number(row.count) }));
  } catch {
    leadsByStatus = [];
    leadsBySource = [];
  }

  return {
    range,
    from,
    to,
    companies,
    contacts,
    leads,
    customers,
    openDeals: Number(openDealsRow?.count ?? 0),
    wonDeals: Number(wonDealsRow?.count ?? 0),
    lostDeals,
    openDealValueCents: Number(openDealsRow?.total ?? 0),
    wonDealValueCents: Number(wonDealsRow?.total ?? 0),
    openTasks,
    overdueTasks,
    activitiesInRange,
    dealsSeries: dailyCounts(
      `SELECT substr(COALESCE("closedAt", "createdAt"), 1, 10) as date, COUNT(*) as value
       FROM "crm_deal"
       WHERE "workspaceId" = ? AND "status" = 'won'
         ${from ? `AND COALESCE("closedAt", "createdAt") >= ?` : ""}
       GROUP BY substr(COALESCE("closedAt", "createdAt"), 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    leadsByStatus,
    leadsBySource,
  };
}

export function getAutomationAnalytics(
  workspaceId: string,
  range: AnalyticsDateRange = "30d",
): AutomationAnalytics {
  ensureAnalyticsReady();
  ensureAutomationReady();
  const { from, to } = resolveRange(range);

  const workflows = safeCount(
    `SELECT COUNT(*) as count FROM "automation_workflow" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const activeWorkflows = safeCount(
    `SELECT COUNT(*) as count FROM "automation_workflow"
     WHERE "workspaceId" = ? AND "status" = 'active'`,
    [workspaceId],
  );
  const runsTotal = safeCount(
    `SELECT COUNT(*) as count FROM "automation_run" WHERE "workspaceId" = ?`,
    [workspaceId],
  );
  const runsInRange = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "automation_run"
         WHERE "workspaceId" = ? AND "createdAt" >= ?`,
        [workspaceId, from],
      )
    : runsTotal;
  const runsSucceeded = safeCount(
    `SELECT COUNT(*) as count FROM "automation_run"
     WHERE "workspaceId" = ? AND "status" = 'succeeded'
       ${from ? `AND "createdAt" >= ?` : ""}`,
    from ? [workspaceId, from] : [workspaceId],
  );
  const runsFailed = safeCount(
    `SELECT COUNT(*) as count FROM "automation_run"
     WHERE "workspaceId" = ? AND "status" = 'failed'
       ${from ? `AND "createdAt" >= ?` : ""}`,
    from ? [workspaceId, from] : [workspaceId],
  );
  const runsQueued = safeCount(
    `SELECT COUNT(*) as count FROM "automation_run"
     WHERE "workspaceId" = ? AND "status" IN ('queued', 'running', 'waiting')`,
    [workspaceId],
  );
  const queuePending = safeCount(
    `SELECT COUNT(*) as count FROM "automation_queue_job"
     WHERE "workspaceId" = ? AND "status" = 'pending'`,
    [workspaceId],
  );

  const decided = runsSucceeded + runsFailed;
  const successRate = decided > 0 ? (runsSucceeded / decided) * 100 : 0;

  let byTrigger: AutomationAnalytics["byTrigger"] = [];
  let byStatus: AutomationAnalytics["byStatus"] = [];
  try {
    byTrigger = (
      sqlite
        .prepare(
          `SELECT "triggerType" as triggerType, COUNT(*) as count
           FROM "automation_run"
           WHERE "workspaceId" = ?${from ? ` AND "createdAt" >= ?` : ""}
           GROUP BY "triggerType" ORDER BY count DESC`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        triggerType: string;
        count: number;
      }>
    ).map((row) => ({
      triggerType: row.triggerType,
      count: Number(row.count),
    }));

    byStatus = (
      sqlite
        .prepare(
          `SELECT "status" as status, COUNT(*) as count
           FROM "automation_run"
           WHERE "workspaceId" = ?${from ? ` AND "createdAt" >= ?` : ""}
           GROUP BY "status" ORDER BY count DESC`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        status: string;
        count: number;
      }>
    ).map((row) => ({ status: row.status, count: Number(row.count) }));
  } catch {
    byTrigger = [];
    byStatus = [];
  }

  return {
    range,
    from,
    to,
    workflows,
    activeWorkflows,
    runsTotal,
    runsInRange,
    runsSucceeded,
    runsFailed,
    runsQueued,
    queuePending,
    successRate,
    runsSeries: dailyCounts(
      `SELECT substr("createdAt", 1, 10) as date, COUNT(*) as value
       FROM "automation_run"
       WHERE "workspaceId" = ?${from ? ` AND "createdAt" >= ?` : ""}
       GROUP BY substr("createdAt", 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    byTrigger,
    byStatus,
  };
}

export function getUserActivityAnalytics(
  workspaceId: string,
  range: AnalyticsDateRange = "30d",
): UserActivityAnalytics {
  ensureAnalyticsReady();
  ensureBillingReady();
  const { from, to } = resolveRange(range);

  const members = countWorkspaceMembers(workspaceId);
  const pendingInvitations = countPendingInvitations(workspaceId);
  const eventsInRange = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "analytics_event"
         WHERE "workspaceId" = ? AND "occurredAt" >= ?`,
        [workspaceId, from],
      )
    : safeCount(
        `SELECT COUNT(*) as count FROM "analytics_event" WHERE "workspaceId" = ?`,
        [workspaceId],
      );

  let sessionsActive = 0;
  if (tableExists("session")) {
    sessionsActive = safeCount(
      `SELECT COUNT(*) as count FROM "session"
       WHERE "activeOrganizationId" = ?
         AND "expiresAt" > ?`,
      [workspaceId, nowIso()],
    );
  }

  let bySource: UserActivityAnalytics["bySource"] = [];
  try {
    bySource = (
      sqlite
        .prepare(
          `SELECT "source" as source, COUNT(*) as count
           FROM "analytics_event"
           WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
           GROUP BY "source" ORDER BY count DESC`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        source: string;
        count: number;
      }>
    ).map((row) => ({ source: row.source, count: Number(row.count) }));
  } catch {
    bySource = [];
  }

  const recent = listEvents(workspaceId, {
    from: from ?? undefined,
    to,
    limit: 25,
  }).map((event) => ({
    id: event.id,
    source: event.source,
    name: event.name,
    userId: event.userId,
    occurredAt: event.occurredAt,
  }));

  return {
    range,
    from,
    to,
    members,
    pendingInvitations,
    eventsInRange,
    sessionsActive,
    activitySeries: dailyCounts(
      `SELECT substr("occurredAt", 1, 10) as date, COUNT(*) as value
       FROM "analytics_event"
       WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
       GROUP BY substr("occurredAt", 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    bySource,
    recentEvents: recent,
  };
}

export function getAiUsageAnalytics(
  workspaceId: string,
  range: AnalyticsDateRange = "30d",
): AiUsageAnalytics {
  ensureAnalyticsReady();
  ensureBillingReady();
  ensureChatbotReady();
  const { from, to } = resolveRange(range);
  const usage = getWorkspaceUsage(workspaceId);

  const totals = sqlite
    .prepare(
      `SELECT
         COUNT(*) as requests,
         SUM(CASE WHEN "success" = 1 THEN 1 ELSE 0 END) as successCount,
         SUM(CASE WHEN "success" = 0 THEN 1 ELSE 0 END) as failureCount,
         COALESCE(SUM("inputTokens"), 0) as inputTokens,
         COALESCE(SUM("outputTokens"), 0) as outputTokens,
         COALESCE(SUM("totalTokens"), 0) as totalTokens,
         COALESCE(SUM("credits"), 0) as credits
       FROM "analytics_ai_usage"
       WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}`,
    )
    .get(...(from ? [workspaceId, from] : [workspaceId])) as {
    requests: number;
    successCount: number;
    failureCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    credits: number;
  };

  const chatbotAiMessages = from
    ? safeCount(
        `SELECT COUNT(*) as count FROM "chatbot_message" m
         JOIN "chatbot_conversation" c ON c."id" = m."conversationId"
         WHERE c."workspaceId" = ? AND m."role" = 'assistant'
           AND m."createdAt" >= ?`,
        [workspaceId, from],
      )
    : safeCount(
        `SELECT COUNT(*) as count FROM "chatbot_message" m
         JOIN "chatbot_conversation" c ON c."id" = m."conversationId"
         WHERE c."workspaceId" = ? AND m."role" = 'assistant'`,
        [workspaceId],
      );

  let byProvider: AiUsageAnalytics["byProvider"] = [];
  let byModel: AiUsageAnalytics["byModel"] = [];
  try {
    byProvider = (
      sqlite
        .prepare(
          `SELECT "provider" as provider,
                  COUNT(*) as requests,
                  COALESCE(SUM("totalTokens"), 0) as tokens,
                  COALESCE(SUM("credits"), 0) as credits
           FROM "analytics_ai_usage"
           WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
           GROUP BY "provider" ORDER BY requests DESC`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        provider: string;
        requests: number;
        tokens: number;
        credits: number;
      }>
    ).map((row) => ({
      provider: row.provider,
      requests: Number(row.requests),
      tokens: Number(row.tokens),
      credits: Number(row.credits),
    }));

    byModel = (
      sqlite
        .prepare(
          `SELECT "model" as model,
                  COUNT(*) as requests,
                  COALESCE(SUM("totalTokens"), 0) as tokens
           FROM "analytics_ai_usage"
           WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
           GROUP BY "model" ORDER BY requests DESC
           LIMIT 20`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        model: string;
        requests: number;
        tokens: number;
      }>
    ).map((row) => ({
      model: row.model,
      requests: Number(row.requests),
      tokens: Number(row.tokens),
    }));
  } catch {
    byProvider = [];
    byModel = [];
  }

  return {
    range,
    from,
    to,
    requests: Number(totals?.requests ?? 0),
    successCount: Number(totals?.successCount ?? 0),
    failureCount: Number(totals?.failureCount ?? 0),
    inputTokens: Number(totals?.inputTokens ?? 0),
    outputTokens: Number(totals?.outputTokens ?? 0),
    totalTokens: Number(totals?.totalTokens ?? 0),
    credits: Number(totals?.credits ?? 0),
    billingAiCredits: usage.aiCredits,
    chatbotAiMessages,
    tokensSeries: dailyCounts(
      `SELECT substr("occurredAt", 1, 10) as date,
              COALESCE(SUM("totalTokens"), 0) as value
       FROM "analytics_ai_usage"
       WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
       GROUP BY substr("occurredAt", 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    creditsSeries: dailyCounts(
      `SELECT substr("occurredAt", 1, 10) as date,
              COALESCE(SUM("credits"), 0) as value
       FROM "analytics_ai_usage"
       WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
       GROUP BY substr("occurredAt", 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    byProvider,
    byModel,
  };
}

export function getApiUsageAnalytics(
  workspaceId: string,
  range: AnalyticsDateRange = "30d",
): ApiUsageAnalytics {
  ensureAnalyticsReady();
  const { from, to } = resolveRange(range);

  const totals = sqlite
    .prepare(
      `SELECT
         COUNT(*) as requests,
         SUM(CASE WHEN "statusCode" >= 400 THEN 1 ELSE 0 END) as errorCount,
         COALESCE(AVG("durationMs"), 0) as avgDurationMs
       FROM "analytics_api_request"
       WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}`,
    )
    .get(...(from ? [workspaceId, from] : [workspaceId])) as {
    requests: number;
    errorCount: number;
    avgDurationMs: number;
  };

  const requests = Number(totals?.requests ?? 0);
  const errorCount = Number(totals?.errorCount ?? 0);
  const successRate =
    requests > 0 ? ((requests - errorCount) / requests) * 100 : 100;

  let byMethod: ApiUsageAnalytics["byMethod"] = [];
  let byStatus: ApiUsageAnalytics["byStatus"] = [];
  let topPaths: ApiUsageAnalytics["topPaths"] = [];
  try {
    byMethod = (
      sqlite
        .prepare(
          `SELECT "method" as method, COUNT(*) as count
           FROM "analytics_api_request"
           WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
           GROUP BY "method" ORDER BY count DESC`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        method: string;
        count: number;
      }>
    ).map((row) => ({ method: row.method, count: Number(row.count) }));

    byStatus = (
      sqlite
        .prepare(
          `SELECT "statusCode" as statusCode, COUNT(*) as count
           FROM "analytics_api_request"
           WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
           GROUP BY "statusCode" ORDER BY count DESC`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        statusCode: number;
        count: number;
      }>
    ).map((row) => ({
      statusCode: Number(row.statusCode),
      count: Number(row.count),
    }));

    topPaths = (
      sqlite
        .prepare(
          `SELECT "path" as path, COUNT(*) as count,
                  COALESCE(AVG("durationMs"), 0) as avgDurationMs
           FROM "analytics_api_request"
           WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
           GROUP BY "path" ORDER BY count DESC
           LIMIT 15`,
        )
        .all(...(from ? [workspaceId, from] : [workspaceId])) as Array<{
        path: string;
        count: number;
        avgDurationMs: number;
      }>
    ).map((row) => ({
      path: row.path,
      count: Number(row.count),
      avgDurationMs: Math.round(Number(row.avgDurationMs)),
    }));
  } catch {
    byMethod = [];
    byStatus = [];
    topPaths = [];
  }

  return {
    range,
    from,
    to,
    requests,
    errorCount,
    successRate,
    avgDurationMs: Math.round(Number(totals?.avgDurationMs ?? 0)),
    requestsSeries: dailyCounts(
      `SELECT substr("occurredAt", 1, 10) as date, COUNT(*) as value
       FROM "analytics_api_request"
       WHERE "workspaceId" = ?${from ? ` AND "occurredAt" >= ?` : ""}
       GROUP BY substr("occurredAt", 1, 10)
       ORDER BY date`,
      from ? [workspaceId, from] : [workspaceId],
      from,
      to,
    ),
    byMethod,
    byStatus,
    topPaths,
  };
}

function metricTables(
  report: AnalyticsReportId,
  workspaceId: string,
  range: AnalyticsDateRange,
): ReportTable[] {
  switch (report) {
    case "overview": {
      const data = getAnalyticsOverview(workspaceId, range);
      return [
        {
          title: "Overview cards",
          headers: ["metric", "value"],
          rows: data.cards.map((card) => [card.label, card.value]),
        },
        {
          title: "Activity series",
          headers: ["date", "value"],
          rows: data.series.activity.map((p) => [p.date, p.value]),
        },
      ];
    }
    case "revenue": {
      const data = getRevenueAnalytics(workspaceId, range);
      return [
        {
          title: "Revenue summary",
          headers: ["metric", "value"],
          rows: [
            ["planId", data.planId],
            ["subscriptionStatus", data.subscriptionStatus],
            ["amountDueCents", data.amountDueCents],
            ["amountPaidCents", data.amountPaidCents],
            ["invoiceCount", data.invoiceCount],
          ],
        },
        {
          title: "Invoices",
          headers: [
            "id",
            "number",
            "status",
            "amountDue",
            "amountPaid",
            "currency",
            "paidAt",
            "createdAt",
          ],
          rows: data.invoices.map((invoice) => [
            invoice.id,
            invoice.number,
            invoice.status,
            invoice.amountDue,
            invoice.amountPaid,
            invoice.currency,
            invoice.paidAt,
            invoice.createdAt,
          ]),
        },
      ];
    }
    case "website": {
      const data = getWebsiteAnalytics(workspaceId, range);
      return [
        {
          title: "Website summary",
          headers: ["metric", "value"],
          rows: [
            ["sites", data.sites],
            ["publishedSites", data.publishedSites],
            ["pages", data.pages],
            ["formSubmissions", data.formSubmissions],
            ["pageViews", data.pageViews],
            ["uniqueVisitors", data.uniqueVisitors],
          ],
        },
        {
          title: "Top pages",
          headers: ["path", "views"],
          rows: data.topPages.map((row) => [row.path, row.views]),
        },
      ];
    }
    case "chatbot": {
      const data = getChatbotAnalytics(workspaceId, range);
      return [
        {
          title: "Chatbot summary",
          headers: ["metric", "value"],
          rows: [
            ["bots", data.bots],
            ["conversations", data.conversations],
            ["messagesInRange", data.messagesInRange],
            ["openHandoffs", data.openHandoffs],
            ["leadsCaptured", data.leadsCaptured],
          ],
        },
        {
          title: "By channel",
          headers: ["channel", "count"],
          rows: data.byChannel.map((row) => [row.channel, row.count]),
        },
      ];
    }
    case "crm": {
      const data = getCrmAnalytics(workspaceId, range);
      return [
        {
          title: "CRM summary",
          headers: ["metric", "value"],
          rows: [
            ["companies", data.companies],
            ["contacts", data.contacts],
            ["leads", data.leads],
            ["customers", data.customers],
            ["openDeals", data.openDeals],
            ["wonDeals", data.wonDeals],
            ["openDealValueCents", data.openDealValueCents],
            ["wonDealValueCents", data.wonDealValueCents],
          ],
        },
        {
          title: "Leads by source",
          headers: ["source", "count"],
          rows: data.leadsBySource.map((row) => [row.source, row.count]),
        },
      ];
    }
    case "automation": {
      const data = getAutomationAnalytics(workspaceId, range);
      return [
        {
          title: "Automation summary",
          headers: ["metric", "value"],
          rows: [
            ["workflows", data.workflows],
            ["activeWorkflows", data.activeWorkflows],
            ["runsInRange", data.runsInRange],
            ["runsSucceeded", data.runsSucceeded],
            ["runsFailed", data.runsFailed],
            ["successRate", data.successRate.toFixed(2)],
          ],
        },
        {
          title: "By trigger",
          headers: ["triggerType", "count"],
          rows: data.byTrigger.map((row) => [row.triggerType, row.count]),
        },
      ];
    }
    case "activity": {
      const data = getUserActivityAnalytics(workspaceId, range);
      return [
        {
          title: "Activity summary",
          headers: ["metric", "value"],
          rows: [
            ["members", data.members],
            ["pendingInvitations", data.pendingInvitations],
            ["eventsInRange", data.eventsInRange],
            ["sessionsActive", data.sessionsActive],
          ],
        },
        {
          title: "Recent events",
          headers: ["id", "source", "name", "userId", "occurredAt"],
          rows: data.recentEvents.map((event) => [
            event.id,
            event.source,
            event.name,
            event.userId,
            event.occurredAt,
          ]),
        },
      ];
    }
    case "ai": {
      const data = getAiUsageAnalytics(workspaceId, range);
      return [
        {
          title: "AI usage summary",
          headers: ["metric", "value"],
          rows: [
            ["requests", data.requests],
            ["totalTokens", data.totalTokens],
            ["credits", data.credits],
            ["billingAiCredits", data.billingAiCredits],
            ["chatbotAiMessages", data.chatbotAiMessages],
          ],
        },
        {
          title: "By provider",
          headers: ["provider", "requests", "tokens", "credits"],
          rows: data.byProvider.map((row) => [
            row.provider,
            row.requests,
            row.tokens,
            row.credits,
          ]),
        },
      ];
    }
    case "api": {
      const data = getApiUsageAnalytics(workspaceId, range);
      return [
        {
          title: "API usage summary",
          headers: ["metric", "value"],
          rows: [
            ["requests", data.requests],
            ["errorCount", data.errorCount],
            ["successRate", data.successRate.toFixed(2)],
            ["avgDurationMs", data.avgDurationMs],
          ],
        },
        {
          title: "Top paths",
          headers: ["path", "count", "avgDurationMs"],
          rows: data.topPaths.map((row) => [
            row.path,
            row.count,
            row.avgDurationMs,
          ]),
        },
      ];
    }
  }
}

export function exportAnalyticsReport(input: {
  workspaceId: string;
  report: AnalyticsReportId;
  format: AnalyticsExportFormat;
  range?: AnalyticsDateRange;
  workspaceName?: string;
}): { filenameBase: string; contentType: string; body: Buffer | string } {
  ensureAnalyticsReady();
  const range = input.range ?? "30d";
  const tables = metricTables(input.report, input.workspaceId, range);
  const title = reportTitle(input.report);

  if (input.format === "csv") {
    return {
      filenameBase: input.report,
      contentType: "text/csv; charset=utf-8",
      body: buildCsvFromTables(tables),
    };
  }

  const lines: string[] = [
    `Workspace: ${input.workspaceName ?? input.workspaceId}`,
    `Range: ${range}`,
    `Generated: ${nowIso()}`,
    "",
  ];
  for (const table of tables) {
    lines.push(table.title);
    lines.push(table.headers.join(" | "));
    for (const row of table.rows.slice(0, 40)) {
      lines.push(row.map((cell) => String(cell ?? "")).join(" | "));
    }
    lines.push("");
  }

  return {
    filenameBase: input.report,
    contentType: "application/pdf",
    body: buildSimplePdf({
      title: `MABPS ${title}`,
      subtitle: input.workspaceName ?? input.workspaceId,
      lines,
    }),
  };
}
