export const ANALYTICS_SOURCES = [
  "website",
  "chatbot",
  "crm",
  "automation",
  "billing",
  "ai",
  "api",
  "user",
  "system",
  "email",
  "notifications",
] as const;

export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number];

export const ANALYTICS_DATE_RANGES = [
  "7d",
  "30d",
  "90d",
  "12m",
  "all",
] as const;

export type AnalyticsDateRange = (typeof ANALYTICS_DATE_RANGES)[number];

export const ANALYTICS_REPORTS = [
  "overview",
  "revenue",
  "website",
  "chatbot",
  "crm",
  "automation",
  "activity",
  "ai",
  "api",
] as const;

export type AnalyticsReportId = (typeof ANALYTICS_REPORTS)[number];

export const ANALYTICS_EXPORT_FORMATS = ["csv", "pdf"] as const;

export type AnalyticsExportFormat = (typeof ANALYTICS_EXPORT_FORMATS)[number];

export type SeriesPoint = {
  date: string;
  value: number;
  label?: string;
};

export type MetricCard = {
  key: string;
  label: string;
  value: number;
  format?: "number" | "currency" | "percent" | "duration";
  change?: number | null;
  series?: SeriesPoint[];
};

export type AnalyticsEvent = {
  id: string;
  workspaceId: string;
  source: AnalyticsSource;
  name: string;
  entityType: string | null;
  entityId: string | null;
  userId: string | null;
  value: number | null;
  unit: string | null;
  properties: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type AnalyticsApiRequest = {
  id: string;
  workspaceId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number | null;
  userId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  occurredAt: string;
  createdAt: string;
};

export type AnalyticsAiUsage = {
  id: string;
  workspaceId: string;
  provider: string;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  credits: number;
  success: boolean;
  entityType: string | null;
  entityId: string | null;
  userId: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type AnalyticsOverview = {
  range: AnalyticsDateRange;
  from: string | null;
  to: string;
  cards: MetricCard[];
  series: {
    activity: SeriesPoint[];
    revenue: SeriesPoint[];
    messages: SeriesPoint[];
    formSubmissions: SeriesPoint[];
  };
  modules: {
    crm: { leads: number; openDeals: number; openDealValueCents: number };
    chatbot: { conversations: number; messages: number; openHandoffs: number };
    website: { sites: number; pages: number; formSubmissions: number };
    automation: { activeWorkflows: number; runsSucceeded: number; runsFailed: number };
    billing: { planId: string; amountPaidCents: number; aiCredits: number };
  };
};

export type RevenueAnalytics = {
  range: AnalyticsDateRange;
  from: string | null;
  to: string;
  planId: string;
  subscriptionStatus: string;
  amountDueCents: number;
  amountPaidCents: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  series: SeriesPoint[];
  invoices: Array<{
    id: string;
    number: string | null;
    status: string | null;
    amountDue: number;
    amountPaid: number;
    currency: string;
    paidAt: string | null;
    createdAt: string;
  }>;
  usage: {
    members: number;
    sites: number;
    storageMb: number;
    aiCredits: number;
    automations: number;
  };
};

export type WebsiteAnalytics = {
  range: AnalyticsDateRange;
  from: string | null;
  to: string;
  sites: number;
  publishedSites: number;
  pages: number;
  blogPosts: number;
  forms: number;
  formSubmissions: number;
  pageViews: number;
  uniqueVisitors: number;
  submissionsSeries: SeriesPoint[];
  pageViewsSeries: SeriesPoint[];
  topPages: Array<{ path: string; views: number }>;
  topSites: Array<{ siteId: string; name: string; submissions: number; views: number }>;
};

export type ChatbotAnalytics = {
  range: AnalyticsDateRange;
  from: string | null;
  to: string;
  bots: number;
  activeBots: number;
  conversations: number;
  conversationsInRange: number;
  messages: number;
  messagesInRange: number;
  openHandoffs: number;
  leadsCaptured: number;
  messagesSeries: SeriesPoint[];
  conversationsSeries: SeriesPoint[];
  byChannel: Array<{ channel: string; count: number }>;
  byRole: Array<{ role: string; count: number }>;
};

export type CrmAnalytics = {
  range: AnalyticsDateRange;
  from: string | null;
  to: string;
  companies: number;
  contacts: number;
  leads: number;
  customers: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDealValueCents: number;
  wonDealValueCents: number;
  openTasks: number;
  overdueTasks: number;
  activitiesInRange: number;
  dealsSeries: SeriesPoint[];
  leadsByStatus: Array<{ status: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
};

export type AutomationAnalytics = {
  range: AnalyticsDateRange;
  from: string | null;
  to: string;
  workflows: number;
  activeWorkflows: number;
  runsTotal: number;
  runsInRange: number;
  runsSucceeded: number;
  runsFailed: number;
  runsQueued: number;
  queuePending: number;
  successRate: number;
  runsSeries: SeriesPoint[];
  byTrigger: Array<{ triggerType: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
};

export type UserActivityAnalytics = {
  range: AnalyticsDateRange;
  from: string | null;
  to: string;
  members: number;
  pendingInvitations: number;
  eventsInRange: number;
  sessionsActive: number;
  activitySeries: SeriesPoint[];
  bySource: Array<{ source: string; count: number }>;
  recentEvents: Array<{
    id: string;
    source: string;
    name: string;
    userId: string | null;
    occurredAt: string;
  }>;
};

export type AiUsageAnalytics = {
  range: AnalyticsDateRange;
  from: string | null;
  to: string;
  requests: number;
  successCount: number;
  failureCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  credits: number;
  billingAiCredits: number;
  chatbotAiMessages: number;
  tokensSeries: SeriesPoint[];
  creditsSeries: SeriesPoint[];
  byProvider: Array<{ provider: string; requests: number; tokens: number; credits: number }>;
  byModel: Array<{ model: string; requests: number; tokens: number }>;
};

export type ApiUsageAnalytics = {
  range: AnalyticsDateRange;
  from: string | null;
  to: string;
  requests: number;
  errorCount: number;
  successRate: number;
  avgDurationMs: number;
  requestsSeries: SeriesPoint[];
  byMethod: Array<{ method: string; count: number }>;
  byStatus: Array<{ statusCode: number; count: number }>;
  topPaths: Array<{ path: string; count: number; avgDurationMs: number }>;
};

export type TrackEventInput = {
  workspaceId: string;
  source: AnalyticsSource;
  name: string;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  value?: number | null;
  unit?: string | null;
  properties?: Record<string, unknown>;
  occurredAt?: string;
};

export type TrackApiRequestInput = {
  workspaceId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs?: number | null;
  userId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  occurredAt?: string;
};

export type TrackAiUsageInput = {
  workspaceId: string;
  provider: string;
  model: string;
  operation?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  credits?: number;
  success?: boolean;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
};

export type AnalyticsListFilters = {
  source?: string;
  name?: string;
  from?: string;
  to?: string;
  userId?: string;
  limit?: number;
  offset?: number;
};
