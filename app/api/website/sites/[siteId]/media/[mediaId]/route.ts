import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { deleteVariantFiles } from "@/lib/website/media-optimize";
import { removeMediaFile } from "@/lib/website/media-storage";
import { findMediaUsages } from "@/lib/website/media-usage";
import {
  deleteMedia,
  getMediaById,
  markMediaUsed,
  updateMedia,
} from "@/lib/website/repository";
import { syncStorageUsage } from "@/lib/website/sites";

type RouteContext = {
  params: Promise<{ siteId: string; mediaId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId, mediaId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const media = getMediaById(mediaId);
    if (!media || media.siteId !== siteId) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }
    const usages = findMediaUsages(siteId, mediaId);
    return NextResponse.json({ media, usages, usageCount: usages.length });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, mediaId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const existing = getMediaById(mediaId);
    if (!existing || existing.siteId !== siteId) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      alt?: unknown;
      originalName?: unknown;
      folderId?: unknown;
      favorited?: unknown;
      markUsed?: unknown;
    };

    if (body.markUsed === true) {
      const media = markMediaUsed(mediaId);
      return NextResponse.json({ media });
    }

    const media = updateMedia(mediaId, {
      alt:
        body.alt === null
          ? null
          : typeof body.alt === "string"
            ? body.alt
            : undefined,
      originalName:
        typeof body.originalName === "string"
          ? body.originalName.trim() || existing.originalName
          : undefined,
      folderId:
        body.folderId === null
          ? null
          : typeof body.folderId === "string"
            ? body.folderId
            : undefined,
      favorited:
        typeof body.favorited === "boolean" ? body.favorited : undefined,
    });

    return NextResponse.json({ media });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, mediaId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const existing = getMediaById(mediaId);
    if (!existing || existing.siteId !== siteId) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "1";
    const usages = findMediaUsages(siteId, mediaId);
    if (usages.length > 0 && !force) {
      return NextResponse.json(
        {
          error:
            "This asset is currently in use. Remove it from pages first, or force delete.",
          usages,
          usageCount: usages.length,
        },
        { status: 409 },
      );
    }

    const deleted = deleteMedia(mediaId);
    await deleteVariantFiles(deleted.variants);
    await removeMediaFile(deleted.storagePath);
    syncStorageUsage(workspace.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
