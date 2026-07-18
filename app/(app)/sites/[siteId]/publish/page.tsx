import { notFound } from "next/navigation";
import { PublishPanel } from "@/components/website/publish-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSiteById } from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SitePublishPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/sites");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspace.id) notFound();

  return (
    <PublishPanel site={site} canManage={isWorkspaceManager(role)} />
  );
}
