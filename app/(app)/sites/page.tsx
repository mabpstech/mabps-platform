import { SitesDashboard } from "@/components/website/sites-dashboard";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getWorkspaceLimits, getWorkspaceUsage } from "@/lib/billing/entitlements";
import { ensureWebsiteReady, listSitesForWorkspace } from "@/lib/website/repository";

export default async function SitesPage() {
  const { workspace, role } = await requireWorkspace({
    callbackUrl: "/sites",
  });
  ensureWebsiteReady();

  const sites = listSitesForWorkspace(workspace.id);
  const limits = getWorkspaceLimits(workspace.id);
  const usage = getWorkspaceUsage(workspace.id);

  return (
    <SitesDashboard
      sites={sites}
      canManage={isWorkspaceManager(role)}
      sitesLimit={limits.sites}
      sitesUsed={usage.sites}
    />
  );
}
