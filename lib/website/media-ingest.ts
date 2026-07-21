import {
  generateImageVariants,
  canOptimizeImage,
  deleteVariantFiles,
} from "@/lib/website/media-optimize";
import {
  removeMediaFile,
  storeMediaBuffer,
  storeMediaFile,
} from "@/lib/website/media-storage";
import { createMedia, updateMedia, getMediaById } from "@/lib/website/repository";
import type { MediaVariants, WebsiteMedia } from "@/lib/website/types";

export async function ingestUploadedMedia(input: {
  workspaceId: string;
  siteId: string;
  file: File;
  alt?: string | null;
  folderId?: string | null;
  uploadedByUserId?: string | null;
  uploadedByName?: string | null;
  replaceMediaId?: string | null;
}): Promise<WebsiteMedia> {
  const stored = await storeMediaFile({
    workspaceId: input.workspaceId,
    siteId: input.siteId,
    file: input.file,
  });

  let mimeType = stored.mimeType;
  let sizeBytes = stored.sizeBytes;
  let storagePath = stored.storagePath;
  let filename = stored.filename;
  let width: number | null = null;
  let height: number | null = null;
  let variants: MediaVariants = {};

  if (canOptimizeImage(mimeType)) {
    try {
      const optimized = await generateImageVariants({
        workspaceId: input.workspaceId,
        siteId: input.siteId,
        buffer: stored.buffer,
        mimeType,
      });
      width = optimized.width || null;
      height = optimized.height || null;
      variants = optimized.variants;

      if (optimized.optimizedOriginal) {
        const rewritten = await storeMediaBuffer({
          workspaceId: input.workspaceId,
          siteId: input.siteId,
          buffer: optimized.optimizedOriginal.buffer,
          mimeType: optimized.optimizedOriginal.mimeType,
          originalName: stored.originalName,
        });
        await removeMediaFile(storagePath);
        storagePath = rewritten.storagePath;
        filename = rewritten.filename;
        sizeBytes = rewritten.sizeBytes;
        mimeType = rewritten.mimeType;
      }

      if (variants.original) {
        variants = {
          ...variants,
          original: {
            ...variants.original,
            storagePath,
            sizeBytes,
            mimeType,
          },
        };
      }
    } catch {
      // Keep original upload if optimization fails.
      variants = {};
    }
  }

  if (input.replaceMediaId) {
    const existing = getMediaById(input.replaceMediaId);
    if (!existing || existing.siteId !== input.siteId) {
      throw new Error("Media not found.");
    }
    await deleteVariantFiles(existing.variants);
    await removeMediaFile(existing.storagePath);

    return updateMedia(existing.id, {
      filename,
      originalName: stored.originalName,
      mimeType,
      sizeBytes,
      storagePath,
      width,
      height,
      alt: input.alt === undefined ? existing.alt : input.alt,
      folderId:
        input.folderId === undefined ? existing.folderId : input.folderId,
      variants,
    });
  }

  return createMedia({
    workspaceId: input.workspaceId,
    siteId: input.siteId,
    filename,
    originalName: stored.originalName,
    mimeType,
    sizeBytes,
    storagePath,
    alt: input.alt ?? stored.originalName,
    width,
    height,
    folderId: input.folderId ?? null,
    uploadedByUserId: input.uploadedByUserId ?? null,
    uploadedByName: input.uploadedByName ?? null,
    variants,
  });
}
