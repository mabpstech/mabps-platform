import { notFound } from "next/navigation";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import {
  getSiteById,
  listMedia,
  listMediaFolders,
  seedDefaultMediaFolders,
} from "@/lib/website/repository";
import { MediaLibraryDynamic } from "@/components/website/media-library-dynamic";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteMediaPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspace.id) notFound();

  const folders = seedDefaultMediaFolders(workspace.id, siteId);

  return (
    <MediaLibraryDynamic
      siteId={siteId}
      media={listMedia(siteId)}
      folders={folders.length ? folders : listMediaFolders(siteId)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
