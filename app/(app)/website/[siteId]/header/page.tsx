import { notFound } from "next/navigation";
import { HeaderEditor } from "@/components/website/header-editor";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getHeaderBySiteId, getSiteById } from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteHeaderPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  const header = getHeaderBySiteId(siteId);
  if (!site || !header || site.workspaceId !== workspace.id) notFound();

  return (
    <HeaderEditor
      siteId={siteId}
      header={header}
      canManage={isWorkspaceManager(role)}
    />
  );
}
