import { DeveloperSdkPanel } from "@/components/marketplace/developer-sdk-panel";
import { requireMarketplaceWorkspace } from "@/lib/marketplace/access";
import { SDK_QUICKSTART } from "@/lib/marketplace/sdk";
import {
  ensureDeveloper,
  listApiKeys,
  listPurchases,
  listWorkspaceListings,
} from "@/lib/marketplace/repository";

export default async function MarketplaceDeveloperPage() {
  const { workspace } = await requireMarketplaceWorkspace(
    "/marketplace/developer",
  );
  const developer = ensureDeveloper(workspace.id, workspace.name);
  return (
    <DeveloperSdkPanel
      developer={developer}
      apiKeys={listApiKeys(workspace.id)}
      listings={listWorkspaceListings(workspace.id)}
      purchases={listPurchases(workspace.id)}
      sdk={SDK_QUICKSTART}
    />
  );
}
