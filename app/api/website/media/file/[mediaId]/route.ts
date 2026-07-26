import { NextResponse } from "next/server";
import {
  requireWebsiteMemberApi,
  WebsiteAuthError,
} from "@/lib/website/access";
import { readMediaFile } from "@/lib/website/media-storage";
import {
  ensureWebsiteReady,
  getMediaById,
  getSiteById,
} from "@/lib/website/repository";
import type { MediaVariantSize } from "@/lib/website/types";

type RouteContext = {
  params: Promise<{ mediaId: string }>;
};

/**
 * Public media file serving for published sites and authenticated previews.
 * Access is granted when the parent site is published, or when the caller
 * has a valid session for the site's owning workspace.
 * Optional ?size=thumbnail|medium|large|original serves responsive variants.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    ensureWebsiteReady();
    const { mediaId } = await context.params;
    const media = getMediaById(mediaId);
    if (!media) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const site = getSiteById(media.siteId);
    if (!site) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const published = site.status === "published";

    if (!published) {
      try {
        const { workspace } = await requireWebsiteMemberApi();
        if (workspace.id !== site.workspaceId) {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }
      } catch (error) {
        if (error instanceof WebsiteAuthError) {
          return NextResponse.json(
            { error: error.message },
            { status: error.status },
          );
        }
        throw error;
      }
    }

    const url = new URL(request.url);
    const sizeParam = url.searchParams.get("size") as MediaVariantSize | null;
    let storagePath = media.storagePath;
    let mimeType = media.mimeType;

    if (sizeParam && sizeParam !== "original") {
      const variant = media.variants?.[sizeParam];
      if (variant?.storagePath) {
        storagePath = variant.storagePath;
        mimeType = variant.mimeType || mimeType;
      } else if (media.variants?.thumbnail?.storagePath && sizeParam === "medium") {
        storagePath = media.variants.thumbnail.storagePath;
        mimeType = media.variants.thumbnail.mimeType || mimeType;
      }
    }

    const buffer = await readMediaFile(storagePath);
    if (!buffer) {
      return NextResponse.json({ error: "File missing." }, { status: 404 });
    }

    const etag = `"${media.updatedAt}-${sizeParam || "original"}-${buffer.byteLength}"`;
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": published
            ? "public, max-age=86400, stale-while-revalidate=604800"
            : "private, no-store",
        },
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.byteLength),
        ETag: etag,
        "Cache-Control": published
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : "private, no-store",
      },
    });
  } catch (error) {
    console.error("[website/media]", error);
    return NextResponse.json(
      { error: "Unable to serve file." },
      { status: 500 },
    );
  }
}
