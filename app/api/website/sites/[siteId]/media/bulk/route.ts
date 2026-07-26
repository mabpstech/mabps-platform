import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { deleteVariantFiles } from "@/lib/website/media-optimize";
import { removeMediaFile } from "@/lib/website/media-storage";
import { findMediaUsages } from "@/lib/website/media-usage";
import {
  deleteMedia,
  getMediaById,
  updateMedia,
} from "@/lib/website/repository";
import { syncStorageUsage } from "@/lib/website/sites";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);

    const body = (await request.json()) as {
      action?: unknown;
      mediaIds?: unknown;
      folderId?: unknown;
      force?: unknown;
    };

    if (!Array.isArray(body.mediaIds) || body.mediaIds.length === 0) {
      return NextResponse.json(
        { error: "mediaIds array is required." },
        { status: 400 },
      );
    }

    const mediaIds = body.mediaIds
      .filter((id): id is string => typeof id === "string" && Boolean(id))
      .slice(0, 100);
    const action = body.action;
    if (
      action !== "delete" &&
      action !== "favorite" &&
      action !== "unfavorite" &&
      action !== "move"
    ) {
      return NextResponse.json(
        { error: "Unsupported bulk action." },
        { status: 400 },
      );
    }

    const force = body.force === true;
    let processed = 0;
    const blocked: Array<{ mediaId: string; usageCount: number }> = [];

    for (const mediaId of mediaIds) {
      const existing = getMediaById(mediaId);
      if (!existing || existing.siteId !== siteId) continue;

      if (action === "favorite" || action === "unfavorite") {
        updateMedia(mediaId, { favorited: action === "favorite" });
        processed += 1;
        continue;
      }

      if (action === "move") {
        const folderId =
          body.folderId === null
            ? null
            : typeof body.folderId === "string"
              ? body.folderId
              : undefined;
        if (folderId === undefined) {
          return NextResponse.json(
            { error: "folderId is required for move." },
            { status: 400 },
          );
        }
        updateMedia(mediaId, { folderId });
        processed += 1;
        continue;
      }

      const usages = findMediaUsages(siteId, mediaId);
      if (usages.length > 0 && !force) {
        blocked.push({ mediaId, usageCount: usages.length });
        continue;
      }

      const deleted = deleteMedia(mediaId);
      await deleteVariantFiles(deleted.variants);
      await removeMediaFile(deleted.storagePath);
      processed += 1;
    }

    if (action === "delete") {
      syncStorageUsage(workspace.id);
    }

    if (action === "delete" && blocked.length > 0 && processed === 0) {
      return NextResponse.json(
        {
          error:
            "Selected assets are in use. Remove them from pages first, or force delete.",
          blocked,
          processed,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      processed,
      blocked,
    });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
