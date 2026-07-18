import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { getSeoBySiteId, updateSeo } from "@/lib/website/repository";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({ seo: getSeoBySiteId(siteId) });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    const seo = updateSeo(siteId, {
      defaultTitle:
        body.defaultTitle === null
          ? null
          : typeof body.defaultTitle === "string"
            ? body.defaultTitle
            : undefined,
      defaultDescription:
        body.defaultDescription === null
          ? null
          : typeof body.defaultDescription === "string"
            ? body.defaultDescription
            : undefined,
      ogImageMediaId:
        body.ogImageMediaId === null
          ? null
          : typeof body.ogImageMediaId === "string"
            ? body.ogImageMediaId
            : undefined,
      twitterHandle:
        body.twitterHandle === null
          ? null
          : typeof body.twitterHandle === "string"
            ? body.twitterHandle
            : undefined,
      robots: typeof body.robots === "string" ? body.robots : undefined,
      canonicalBaseUrl:
        body.canonicalBaseUrl === null
          ? null
          : typeof body.canonicalBaseUrl === "string"
            ? body.canonicalBaseUrl
            : undefined,
      jsonLd:
        body.jsonLd === null
          ? null
          : typeof body.jsonLd === "string"
            ? body.jsonLd
            : undefined,
    });

    return NextResponse.json({ seo });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
