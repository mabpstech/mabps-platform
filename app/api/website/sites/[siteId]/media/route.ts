import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { storeMediaFile } from "@/lib/website/media-storage";
import { createMedia, listMedia } from "@/lib/website/repository";
import { assertStorageAvailable, syncStorageUsage } from "@/lib/website/sites";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({ media: listMedia(siteId) });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
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

    const stored = await storeMediaFile({
      workspaceId: workspace.id,
      siteId,
      file,
    });

    const alt =
      typeof formData.get("alt") === "string"
        ? String(formData.get("alt"))
        : null;

    const media = createMedia({
      workspaceId: workspace.id,
      siteId,
      filename: stored.filename,
      originalName: stored.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      storagePath: stored.storagePath,
      alt,
    });

    syncStorageUsage(workspace.id);

    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
