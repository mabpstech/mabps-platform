import { notFound } from "next/navigation";
import { BlogPostEditor } from "@/components/website/blog-post-editor";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getBlogPostById, getSiteById } from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string; postId: string }>;
};

export default async function SiteBlogPostPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId, postId } = await params;
  const site = getSiteById(siteId);
  const post = getBlogPostById(postId);
  if (!site || !post || site.workspaceId !== workspace.id || post.siteId !== siteId) {
    notFound();
  }

  return (
    <BlogPostEditor
      siteId={siteId}
      post={post}
      canManage={isWorkspaceManager(role)}
    />
  );
}
