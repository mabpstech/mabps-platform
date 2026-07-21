import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { ingestUploadedMedia } from "@/lib/website/media-ingest";
import {
  listMedia,
  listMediaFolders,
  seedDefaultMediaFolders,
} from "@/lib/website/repository";
import { assertStorageAvailable, syncStorageUsage } from "@/lib/website/sites";
import type { MediaKind, MediaListQuery } from "@/lib/website/types";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

function parseListQuery(url: URL): MediaListQuery {
  const kind = url.searchParams.get("kind");
  const folderId = url.searchParams.get("folderId");
  const sort = url.searchParams.get("sort");
  const recent = url.searchParams.get("recent");
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");
  return {
    q: url.searchParams.get("q") || undefined,
    kind: (kind as MediaKind | "all" | null) || undefined,
    folderId:
      folderId === "unfiled"
        ? "unfiled"
        : folderId === "all" || !folderId
          ? undefined
          : folderId,
    favorited: url.searchParams.get("favorited") === "1",
    recent:
      recent === "uploaded" || recent === "used" ? recent : undefined,
    sort:
      sort === "newest" ||
      sort === "oldest" ||
      sort === "name" ||
      sort === "size" ||
      sort === "used"
        ? sort
        : undefined,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);

    const url = new URL(request.url);
    const query = parseListQuery(url);
    const includeFolders = url.searchParams.get("folders") !== "0";

    if (includeFolders) {
      seedDefaultMediaFolders(workspace.id, siteId);
    }

    const filtered = listMedia(siteId, {
      ...query,
      limit: undefined,
      offset: undefined,
    });
    const total = filtered.length;
    const offset = Math.max(0, query.offset ?? 0);
    const media =
      query.limit && query.limit > 0
        ? filtered.slice(offset, offset + query.limit)
        : offset > 0
          ? filtered.slice(offset)
          : filtered;

    return NextResponse.json({
      media,
      total,
      folders: includeFolders ? listMediaFolders(siteId) : undefined,
    });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required." },
        { status: 400 },
      );
    }

    assertStorageAvailable(workspace.id, file.size);

    const alt =
      typeof formData.get("alt") === "string"
        ? String(formData.get("alt"))
        : null;
    const folderRaw = formData.get("folderId");
    const folderId =
      typeof folderRaw === "string" && folderRaw.length > 0
        ? folderRaw
        : null;
    const replaceRaw = formData.get("replaceMediaId");
    const replaceMediaId =
      typeof replaceRaw === "string" && replaceRaw.length > 0
        ? replaceRaw
        : null;

    const media = await ingestUploadedMedia({
      workspaceId: workspace.id,
      siteId,
      file,
      alt,
      folderId,
      replaceMediaId,
      uploadedByUserId: session.user.id,
      uploadedByName: session.user.name || session.user.email || null,
    });

    syncStorageUsage(workspace.id);

    return NextResponse.json({ media }, { status: replaceMediaId ? 200 : 201 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
