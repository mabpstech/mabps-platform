import { SandboxConsole } from "@/components/marketplace/sandbox-console";
import { requireMarketplaceWorkspace } from "@/lib/marketplace/access";
import {
  listInstallsWithListings,
  listSandboxRuns,
} from "@/lib/marketplace/repository";

export default async function MarketplaceSandboxPage() {
  const { workspace } = await requireMarketplaceWorkspace(
    "/marketplace/sandbox",
  );
  return (
    <SandboxConsole
      installs={listInstallsWithListings(workspace.id)}
      runs={listSandboxRuns(workspace.id)}
    />
  );
}
