import { WebsiteAnalyticsPanel } from "@/components/analytics/domain-panels";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { parseAnalyticsDateRange } from "@/lib/analytics/http";
import { getWebsiteAnalytics } from "@/lib/analytics/repository";

export default async function AnalyticsWebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspace } = await requireAnalyticsWorkspace("/analytics/website");
  const params = await searchParams;
  const range = parseAnalyticsDateRange(params.range);

  return (
    <WebsiteAnalyticsPanel data={getWebsiteAnalytics(workspace.id, range)} />
  );
}
