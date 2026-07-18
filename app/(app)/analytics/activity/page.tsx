import { ActivityAnalyticsPanel } from "@/components/analytics/domain-panels";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { parseAnalyticsDateRange } from "@/lib/analytics/http";
import { getUserActivityAnalytics } from "@/lib/analytics/repository";

export default async function AnalyticsActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspace } = await requireAnalyticsWorkspace("/analytics/activity");
  const params = await searchParams;
  const range = parseAnalyticsDateRange(params.range);

  return (
    <ActivityAnalyticsPanel
      data={getUserActivityAnalytics(workspace.id, range)}
    />
  );
}
