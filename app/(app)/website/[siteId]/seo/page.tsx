import { notFound } from "next/navigation";
import { SeoEditor } from "@/components/website/seo-editor";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import {
  getSeoBySiteId,
  getSiteById,
  getThemeBySiteId,
} from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteSeoPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  const seo = getSeoBySiteId(siteId);
  const theme = getThemeBySiteId(siteId);
  if (!site || !seo || !theme || site.workspaceId !== workspace.id) notFound();

  return (
    <SeoEditor
      siteId={siteId}
      siteSlug={site.slug}
      siteName={site.name}
      seo={seo}
      faviconMediaId={
        theme.faviconMediaId || theme.tokens.brand.faviconMediaId || null
      }
      canManage={isWorkspaceManager(role)}
    />
  );
}
