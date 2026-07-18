import { RevenueAnalyticsPanel } from "@/components/analytics/domain-panels";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { parseAnalyticsDateRange } from "@/lib/analytics/http";
import { getRevenueAnalytics } from "@/lib/analytics/repository";

export default async function AnalyticsRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspace } = await requireAnalyticsWorkspace("/analytics/revenue");
  const params = await searchParams;
  const range = parseAnalyticsDateRange(params.range);

  return (
    <RevenueAnalyticsPanel data={getRevenueAnalytics(workspace.id, range)} />
  );
}
