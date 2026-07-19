import { InstallsManager } from "@/components/marketplace/installs-manager";
import { requireMarketplaceWorkspace } from "@/lib/marketplace/access";
import {
  listInstallsWithListings,
  listUpdatesAvailable,
} from "@/lib/marketplace/repository";

export default async function MarketplaceInstallsPage() {
  const { workspace } = await requireMarketplaceWorkspace(
    "/marketplace/installs",
  );
  return (
    <InstallsManager
      installs={listInstallsWithListings(workspace.id)}
      updates={listUpdatesAvailable(workspace.id)}
    />
  );
}
