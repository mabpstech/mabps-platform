import { AnalyticsOverviewPanel } from "@/components/analytics/analytics-overview";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { parseAnalyticsDateRange } from "@/lib/analytics/http";
import { getAnalyticsOverview } from "@/lib/analytics/repository";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspace } = await requireAnalyticsWorkspace("/analytics");
  const params = await searchParams;
  const range = parseAnalyticsDateRange(params.range);

  return (
    <AnalyticsOverviewPanel
      overview={getAnalyticsOverview(workspace.id, range)}
    />
  );
}
