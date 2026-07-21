import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import {
  deleteMediaFolder,
  getMediaFolderById,
  updateMediaFolder,
} from "@/lib/website/repository";

type RouteContext = {
  params: Promise<{ siteId: string; folderId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, folderId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const existing = getMediaFolderById(folderId);
    if (!existing || existing.siteId !== siteId) {
      return NextResponse.json({ error: "Folder not found." }, { status: 404 });
    }
    const body = (await request.json()) as {
      name?: unknown;
      parentId?: unknown;
    };
    const folder = updateMediaFolder(folderId, {
      name: typeof body.name === "string" ? body.name : undefined,
      parentId:
        body.parentId === null
          ? null
          : typeof body.parentId === "string"
            ? body.parentId
            : undefined,
    });
    return NextResponse.json({ folder });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, folderId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const existing = getMediaFolderById(folderId);
    if (!existing || existing.siteId !== siteId) {
      return NextResponse.json({ error: "Folder not found." }, { status: 404 });
    }
    deleteMediaFolder(folderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
