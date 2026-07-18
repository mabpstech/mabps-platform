import { AnalyticsSubnav } from "@/components/analytics/analytics-subnav";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { ensureAnalyticsReady } from "@/lib/analytics/repository";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAnalyticsWorkspace("/analytics");
  ensureAnalyticsReady();

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <AnalyticsSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
