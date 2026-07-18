import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { publishSite, unpublishSite } from "@/lib/website/publish";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);

    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
    };

    if (body.action === "unpublish") {
      const site = unpublishSite(siteId);
      return NextResponse.json({ site });
    }

    const result = publishSite(siteId);
    return NextResponse.json(result);
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
