import { SitesDashboard } from "@/components/website/sites-dashboard";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getWorkspaceLimits, getWorkspaceUsage } from "@/lib/billing/entitlements";
import {
  ensureWebsiteReady,
  getHeaderBySiteId,
  getThemeBySiteId,
  listSitesForWorkspace,
} from "@/lib/website/repository";
import { detectPresetId, getThemePreset, presetDisplayName } from "@/lib/website/theme";

function themeDisplayName(theme: NonNullable<ReturnType<typeof getThemeBySiteId>>): string {
  const presetId = detectPresetId(theme.tokens) || theme.tokens.presetId;
  if (presetId) {
    const preset = getThemePreset(presetId);
    if (preset) return preset.name;
  }
  return presetDisplayName(theme.primaryColor);
}

export default async function SitesPage() {
  const { workspace, role } = await requireWorkspace({
    callbackUrl: "/website",
  });
  ensureWebsiteReady();

  const sites = listSitesForWorkspace(workspace.id).map((site) => {
    const theme = getThemeBySiteId(site.id);
    const header = getHeaderBySiteId(site.id);
    return {
      ...site,
      logoMediaId: header?.logoMediaId ?? theme?.logoMediaId ?? null,
      logoText: header?.logoText ?? null,
      primaryColor: theme?.primaryColor ?? "#18181b",
      themeName: theme ? themeDisplayName(theme) : "Custom",
    };
  });
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
