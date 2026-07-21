import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import {
  createMediaFolder,
  listMediaFolders,
  seedDefaultMediaFolders,
} from "@/lib/website/repository";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const folders = seedDefaultMediaFolders(workspace.id, siteId);
    return NextResponse.json({
      folders: folders.length ? folders : listMediaFolders(siteId),
    });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const body = (await request.json()) as {
      name?: unknown;
      parentId?: unknown;
    };
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Folder name is required." },
        { status: 400 },
      );
    }
    const folder = createMediaFolder({
      workspaceId: workspace.id,
      siteId,
      name: body.name.trim(),
      parentId:
        typeof body.parentId === "string" && body.parentId
          ? body.parentId
          : null,
    });
    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
