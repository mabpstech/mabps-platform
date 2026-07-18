import { notFound } from "next/navigation";
import { SeoEditor } from "@/components/website/seo-editor";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSeoBySiteId, getSiteById } from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteSeoPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/sites");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  const seo = getSeoBySiteId(siteId);
  if (!site || !seo || site.workspaceId !== workspace.id) notFound();

  return (
    <SeoEditor
      siteId={siteId}
      seo={seo}
      canManage={isWorkspaceManager(role)}
    />
  );
}
