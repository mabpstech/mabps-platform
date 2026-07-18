import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { createPage, listPages } from "@/lib/website/repository";
import { isPageType } from "@/lib/website/types";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({ pages: listPages(siteId) });
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
      title?: unknown;
      slug?: unknown;
      pageType?: unknown;
    };

    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Page title is required." },
        { status: 400 },
      );
    }

    const page = createPage({
      siteId,
      title: body.title,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      pageType: isPageType(body.pageType) ? body.pageType : "custom",
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
