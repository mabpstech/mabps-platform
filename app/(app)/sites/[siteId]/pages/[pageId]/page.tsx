import { notFound } from "next/navigation";
import { PageBuilder } from "@/components/website/page-builder";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import {
  getPageById,
  getSiteById,
  listSections,
} from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string; pageId: string }>;
};

export default async function SitePageBuilderPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/sites");
  const { siteId, pageId } = await params;
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspace.id) notFound();
  const page = getPageById(pageId);
  if (!page || page.siteId !== siteId) notFound();

  return (
    <PageBuilder
      siteId={siteId}
      page={page}
      initialSections={listSections(pageId)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
