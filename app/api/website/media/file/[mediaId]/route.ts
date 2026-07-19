import fs from "node:fs";
import { NextResponse } from "next/server";
import {
  requireWebsiteMemberApi,
  WebsiteAuthError,
} from "@/lib/website/access";
import { resolveMediaAbsolutePath } from "@/lib/website/media-storage";
import {
  ensureWebsiteReady,
  getMediaById,
  getSiteById,
} from "@/lib/website/repository";

type RouteContext = {
  params: Promise<{ mediaId: string }>;
};

/**
 * Public media file serving for published sites and authenticated previews.
 * Access is granted when the parent site is published, or when the caller
 * has a valid session for the site's owning workspace.
 */
export async function GET(_request: Request, context: RouteContext) {
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

    if (site.status !== "published") {
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

    const absolute = resolveMediaAbsolutePath(media.storagePath);
    if (!fs.existsSync(absolute)) {
      return NextResponse.json({ error: "File missing." }, { status: 404 });
    }

    const buffer = fs.readFileSync(absolute);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[website/media]", error);
    return NextResponse.json({ error: "Unable to serve file." }, { status: 500 });
  }
}
