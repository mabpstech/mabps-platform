import { notFound } from "next/navigation";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSiteById, getThemeBySiteId } from "@/lib/website/repository";
import { ThemeStudioDynamic } from "@/components/website/theme/theme-studio-dynamic";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteThemePage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  const theme = getThemeBySiteId(siteId);
  if (!site || !theme || site.workspaceId !== workspace.id) notFound();

  return (
    <ThemeStudioDynamic
      siteId={siteId}
      theme={theme}
      siteName={site.name}
      canManage={isWorkspaceManager(role)}
    />
  );
}
