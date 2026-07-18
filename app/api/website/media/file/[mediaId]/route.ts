import fs from "node:fs";
import { NextResponse } from "next/server";
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
 * Access is granted when the parent site is published, or when a session
 * cookie is present (optimistic; builder always loads after auth).
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

    const cookie = request.headers.get("cookie") || "";
    const hasSession =
      cookie.includes("better-auth") || cookie.includes("session_token");
    if (site.status !== "published" && !hasSession) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
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
