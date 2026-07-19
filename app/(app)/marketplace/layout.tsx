import { MarketplaceSubnav } from "@/components/marketplace/marketplace-subnav";
import { requireMarketplaceWorkspace } from "@/lib/marketplace/access";
import { ensureMarketplaceReady } from "@/lib/marketplace/repository";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMarketplaceWorkspace("/marketplace");
  ensureMarketplaceReady();

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <MarketplaceSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
