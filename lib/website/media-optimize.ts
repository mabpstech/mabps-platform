import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getMediaBlobStore } from "@/lib/storage/media-blob-store";
import { siteUploadDir } from "@/lib/website/media-storage";
import type { MediaVariant, MediaVariants } from "@/lib/website/types";

const RASTER_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const VARIANT_WIDTHS = {
  thumbnail: 320,
  medium: 960,
  large: 1920,
} as const;

export function canOptimizeImage(mimeType: string): boolean {
  return RASTER_MIME.has(mimeType);
}

export async function readImageDimensions(
  buffer: Buffer,
): Promise<{ width: number; height: number } | null> {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

async function writeVariant(input: {
  workspaceId: string;
  siteId: string;
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  ext: string;
}): Promise<MediaVariant> {
  const dir = siteUploadDir(input.workspaceId, input.siteId);
  const filename = `${randomUUID()}${input.ext}`;
  const storagePath = path.posix.join(dir, filename);
  await getMediaBlobStore().put(storagePath, input.buffer, {
    contentType: input.mimeType,
  });
  return {
    storagePath,
    width: input.width,
    height: input.height,
    sizeBytes: input.buffer.byteLength,
    mimeType: input.mimeType,
  };
}

export async function generateImageVariants(input: {
  workspaceId: string;
  siteId: string;
  buffer: Buffer;
  mimeType: string;
  quality?: number;
}): Promise<{
  width: number;
  height: number;
  variants: MediaVariants;
  optimizedOriginal?: { buffer: Buffer; mimeType: string; sizeBytes: number };
}> {
  if (!canOptimizeImage(input.mimeType)) {
    return { width: 0, height: 0, variants: {} };
  }

  const quality = input.quality ?? 82;
  const image = sharp(input.buffer, { animated: input.mimeType === "image/gif" });
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const variants: MediaVariants = {
    original: {
      storagePath: "",
      width,
      height,
      sizeBytes: input.buffer.byteLength,
      mimeType: input.mimeType,
    },
  };

  // Prefer WebP for derived sizes (responsive delivery).
  for (const [size, maxWidth] of Object.entries(VARIANT_WIDTHS) as Array<
    [keyof typeof VARIANT_WIDTHS, number]
  >) {
    if (!width || width <= maxWidth * 1.1) {
      // Still generate a compressed webp thumbnail for grid speed.
      if (size !== "thumbnail") continue;
    }
    const resized = sharp(input.buffer).rotate().resize({
      width: Math.min(maxWidth, width || maxWidth),
      withoutEnlargement: true,
    });
    const out = await resized.webp({ quality }).toBuffer({ resolveWithObject: true });
    variants[size] = await writeVariant({
      workspaceId: input.workspaceId,
      siteId: input.siteId,
      buffer: out.data,
      width: out.info.width,
      height: out.info.height,
      mimeType: "image/webp",
      ext: ".webp",
    });
  }

  // Light original optimization (keep format unless huge JPEG/PNG).
  let optimizedOriginal: { buffer: Buffer; mimeType: string; sizeBytes: number } | undefined;
  if (input.mimeType === "image/jpeg" || input.mimeType === "image/png") {
    const pipeline =
      input.mimeType === "image/jpeg"
        ? sharp(input.buffer).rotate().jpeg({ quality, mozjpeg: true })
        : sharp(input.buffer).rotate().png({ compressionLevel: 8 });
    const out = await pipeline.toBuffer();
    if (out.byteLength < input.buffer.byteLength * 0.95) {
      optimizedOriginal = {
        buffer: out,
        mimeType: input.mimeType,
        sizeBytes: out.byteLength,
      };
    }
  }

  return { width, height, variants, optimizedOriginal };
}

export async function editImageBuffer(input: {
  buffer: Buffer;
  mimeType: string;
  crop?: { left: number; top: number; width: number; height: number };
  rotate?: 0 | 90 | 180 | 270;
  flip?: "horizontal" | "vertical" | "both";
  resize?: { width?: number; height?: number; lockAspect?: boolean };
  compressQuality?: number;
  convertToWebp?: boolean;
}): Promise<{ buffer: Buffer; mimeType: string; width: number; height: number }> {
  let pipeline = sharp(input.buffer).rotate();

  if (input.crop) {
    pipeline = pipeline.extract({
      left: Math.max(0, Math.round(input.crop.left)),
      top: Math.max(0, Math.round(input.crop.top)),
      width: Math.max(1, Math.round(input.crop.width)),
      height: Math.max(1, Math.round(input.crop.height)),
    });
  }

  if (input.rotate) {
    pipeline = pipeline.rotate(input.rotate);
  }

  if (input.flip === "horizontal" || input.flip === "both") {
    pipeline = pipeline.flop();
  }
  if (input.flip === "vertical" || input.flip === "both") {
    pipeline = pipeline.flip();
  }

  if (input.resize?.width || input.resize?.height) {
    pipeline = pipeline.resize({
      width: input.resize.width,
      height: input.resize.height,
      fit: input.resize.lockAspect === false ? "fill" : "inside",
      withoutEnlargement: false,
    });
  }

  const quality = input.compressQuality ?? 82;
  const convertWebp = Boolean(input.convertToWebp);
  const out = convertWebp
    ? await pipeline.webp({ quality }).toBuffer({ resolveWithObject: true })
    : input.mimeType === "image/png"
      ? await pipeline.png({ compressionLevel: 8 }).toBuffer({ resolveWithObject: true })
      : input.mimeType === "image/webp"
        ? await pipeline.webp({ quality }).toBuffer({ resolveWithObject: true })
        : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true });

  return {
    buffer: out.data,
    mimeType: convertWebp
      ? "image/webp"
      : input.mimeType === "image/png" || input.mimeType === "image/webp"
        ? input.mimeType
        : "image/jpeg",
    width: out.info.width,
    height: out.info.height,
  };
}

export async function deleteVariantFiles(variants: MediaVariants): Promise<void> {
  const store = getMediaBlobStore();
  for (const variant of Object.values(variants)) {
    if (!variant?.storagePath) continue;
    try {
      await store.delete(variant.storagePath);
    } catch {
      // Best-effort cleanup.
    }
  }
}
