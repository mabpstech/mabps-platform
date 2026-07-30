import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import {
  getPageById,
  getSiteById,
  listSections,
} from "@/lib/website/repository";

const PageBuilder = dynamic(
  () =>
    import("@/components/website/page-builder").then((mod) => mod.PageBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading page builder…
      </div>
    ),
  },
);

type PageProps = {
  params: Promise<{ siteId: string; pageId: string }>;
};

export default async function SitePageBuilderPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
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
      siteSlug={site.slug}
      siteStatus={site.status}
    />
  );
}
