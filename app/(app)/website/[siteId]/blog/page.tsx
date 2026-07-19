import { notFound } from "next/navigation";
import { BlogManager } from "@/components/website/blog-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSiteById, listBlogPosts } from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteBlogPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspace.id) notFound();

  return (
    <BlogManager
      siteId={siteId}
      posts={listBlogPosts(siteId)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
