import { notFound } from "next/navigation";
import { FooterEditor } from "@/components/website/footer-editor";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getFooterBySiteId, getSiteById } from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteFooterPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/sites");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  const footer = getFooterBySiteId(siteId);
  if (!site || !footer || site.workspaceId !== workspace.id) notFound();

  return (
    <FooterEditor
      siteId={siteId}
      footer={footer}
      canManage={isWorkspaceManager(role)}
    />
  );
}
