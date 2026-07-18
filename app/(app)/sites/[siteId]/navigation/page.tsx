import { notFound } from "next/navigation";
import { NavigationEditor } from "@/components/website/navigation-editor";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import {
  getSiteById,
  listNavItems,
  listPages,
} from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteNavigationPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/sites");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspace.id) notFound();

  return (
    <NavigationEditor
      siteId={siteId}
      navigation={listNavItems(siteId)}
      pages={listPages(siteId)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
