import { notFound } from "next/navigation";
import { PagesManager } from "@/components/website/pages-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSiteById, listPages } from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SitePagesPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspace.id) notFound();

  return (
    <PagesManager
      siteId={siteId}
      pages={listPages(siteId)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
