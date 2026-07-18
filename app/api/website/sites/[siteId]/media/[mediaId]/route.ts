import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { removeMediaFile } from "@/lib/website/media-storage";
import {
  deleteMedia,
  getMediaById,
  updateMedia,
} from "@/lib/website/repository";
import { syncStorageUsage } from "@/lib/website/sites";

type RouteContext = {
  params: Promise<{ siteId: string; mediaId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, mediaId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const existing = getMediaById(mediaId);
    if (!existing || existing.siteId !== siteId) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    const body = (await request.json()) as { alt?: unknown };
    const media = updateMedia(mediaId, {
      alt:
        body.alt === null
          ? null
          : typeof body.alt === "string"
            ? body.alt
            : undefined,
    });

    return NextResponse.json({ media });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, mediaId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const existing = getMediaById(mediaId);
    if (!existing || existing.siteId !== siteId) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    const deleted = deleteMedia(mediaId);
    removeMediaFile(deleted.storagePath);
    syncStorageUsage(workspace.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
