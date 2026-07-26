import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { getPublishHistory, publishSite, unpublishSite } from "@/lib/website/publish";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({ events: getPublishHistory(siteId, 30) });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);

    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
    };

    const actor = {
      userId: session.user.id,
      name: session.user.name || session.user.email || "Workspace member",
    };

    if (body.action === "unpublish") {
      const result = unpublishSite(siteId, actor);
      return NextResponse.json({
        site: result.site,
        event: result.event,
        events: getPublishHistory(siteId, 30),
      });
    }

    const result = publishSite(siteId, actor);
    return NextResponse.json({
      ...result,
      events: getPublishHistory(siteId, 30),
    });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
