import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import {
  canOptimizeImage,
  deleteVariantFiles,
  editImageBuffer,
  generateImageVariants,
} from "@/lib/website/media-optimize";
import {
  readMediaFile,
  removeMediaFile,
  storeMediaBuffer,
} from "@/lib/website/media-storage";
import { getMediaById, updateMedia } from "@/lib/website/repository";
import { assertStorageAvailable, syncStorageUsage } from "@/lib/website/sites";

type RouteContext = {
  params: Promise<{ siteId: string; mediaId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, mediaId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const existing = getMediaById(mediaId);
    if (!existing || existing.siteId !== siteId) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }
    if (!canOptimizeImage(existing.mimeType) && existing.mimeType !== "image/svg+xml") {
      return NextResponse.json(
        { error: "Only raster images can be edited." },
        { status: 400 },
      );
    }
    if (existing.mimeType === "image/svg+xml") {
      return NextResponse.json(
        { error: "SVG editing is not supported. Re-upload a raster image." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      crop?: { left: number; top: number; width: number; height: number };
      rotate?: 0 | 90 | 180 | 270;
      flip?: "horizontal" | "vertical" | "both";
      resize?: { width?: number; height?: number; lockAspect?: boolean };
      compressQuality?: number;
      convertToWebp?: boolean;
      generateThumbnail?: boolean;
    };

    const source = await readMediaFile(existing.storagePath);
    if (!source) {
      return NextResponse.json({ error: "File missing." }, { status: 404 });
    }

    const edited = await editImageBuffer({
      buffer: source,
      mimeType: existing.mimeType,
      crop: body.crop,
      rotate: body.rotate,
      flip: body.flip,
      resize: body.resize,
      compressQuality: body.compressQuality,
      convertToWebp: body.convertToWebp,
    });

    assertStorageAvailable(
      workspace.id,
      Math.max(0, edited.buffer.byteLength - existing.sizeBytes),
    );

    const stored = await storeMediaBuffer({
      workspaceId: workspace.id,
      siteId,
      buffer: edited.buffer,
      mimeType: edited.mimeType,
      originalName: existing.originalName.replace(/\.[^.]+$/, "") +
        (edited.mimeType === "image/webp"
          ? ".webp"
          : edited.mimeType === "image/png"
            ? ".png"
            : ".jpg"),
    });

    await deleteVariantFiles(existing.variants);
    await removeMediaFile(existing.storagePath);

    const optimized = await generateImageVariants({
      workspaceId: workspace.id,
      siteId,
      buffer: edited.buffer,
      mimeType: edited.mimeType,
      quality: body.compressQuality,
    });

    const variants = {
      ...optimized.variants,
      original: {
        storagePath: stored.storagePath,
        width: edited.width,
        height: edited.height,
        sizeBytes: stored.sizeBytes,
        mimeType: stored.mimeType,
      },
    };

    const media = updateMedia(mediaId, {
      filename: stored.filename,
      storagePath: stored.storagePath,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      width: edited.width,
      height: edited.height,
      variants,
    });

    syncStorageUsage(workspace.id);
    return NextResponse.json({ media });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
