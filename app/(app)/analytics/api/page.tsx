import { ApiUsageAnalyticsPanel } from "@/components/analytics/domain-panels";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { parseAnalyticsDateRange } from "@/lib/analytics/http";
import { getApiUsageAnalytics } from "@/lib/analytics/repository";

export default async function AnalyticsApiPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspace } = await requireAnalyticsWorkspace("/analytics/api");
  const params = await searchParams;
  const range = parseAnalyticsDateRange(params.range);

  return (
    <ApiUsageAnalyticsPanel data={getApiUsageAnalytics(workspace.id, range)} />
  );
}
