import { notFound } from "next/navigation";
import { ThemeEditor } from "@/components/website/theme-editor";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSiteById, getThemeBySiteId } from "@/lib/website/repository";

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
    <ThemeEditor
      siteId={siteId}
      theme={theme}
      canManage={isWorkspaceManager(role)}
    />
  );
}
