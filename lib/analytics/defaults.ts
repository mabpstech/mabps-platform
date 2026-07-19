import type {
  AnalyticsDateRange,
  AnalyticsReportId,
  AnalyticsSource,
} from "@/lib/analytics/types";

export const SOURCE_LABELS: Record<AnalyticsSource, string> = {
  website: "Website",
  chatbot: "Chatbot",
  crm: "CRM",
  automation: "Automation",
  billing: "Billing",
  ai: "AI",
  api: "API",
  user: "User",
  system: "System",
  email: "Email",
  notifications: "Notifications",
};

export const REPORT_LABELS: Record<AnalyticsReportId, string> = {
  overview: "Dashboard overview",
  revenue: "Revenue",
  website: "Website",
  chatbot: "Chatbot",
  crm: "CRM",
  automation: "Automation",
  activity: "User activity",
  ai: "AI usage",
  api: "API usage",
};

export const DATE_RANGE_LABELS: Record<AnalyticsDateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  all: "All time",
};

export const DEFAULT_DATE_RANGE: AnalyticsDateRange = "30d";

export function daysForRange(range: AnalyticsDateRange): number | null {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "12m":
      return 365;
    case "all":
      return null;
  }
}
