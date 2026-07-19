import { MarketplaceOverview } from "@/components/marketplace/marketplace-overview";
import { requireMarketplaceWorkspace } from "@/lib/marketplace/access";
import { getMarketplaceOverview } from "@/lib/marketplace/repository";

export default async function MarketplacePage() {
  const { workspace } = await requireMarketplaceWorkspace("/marketplace");
  const stats = getMarketplaceOverview(workspace.id);
  return <MarketplaceOverview stats={stats} />;
}
