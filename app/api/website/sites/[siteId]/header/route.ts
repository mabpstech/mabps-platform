import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { getHeaderBySiteId, updateHeader } from "@/lib/website/repository";
import { isButtonStyle } from "@/lib/website/types";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({ header: getHeaderBySiteId(siteId) });
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

    const header = updateHeader(siteId, {
      logoText:
        body.logoText === null
          ? null
          : typeof body.logoText === "string"
            ? body.logoText
            : undefined,
      logoMediaId:
        body.logoMediaId === null
          ? null
          : typeof body.logoMediaId === "string"
            ? body.logoMediaId
            : undefined,
      showLogo: typeof body.showLogo === "boolean" ? body.showLogo : undefined,
      sticky: typeof body.sticky === "boolean" ? body.sticky : undefined,
      backgroundColor:
        body.backgroundColor === null
          ? null
          : typeof body.backgroundColor === "string"
            ? body.backgroundColor
            : undefined,
      textColor:
        body.textColor === null
          ? null
          : typeof body.textColor === "string"
            ? body.textColor
            : undefined,
      ctaLabel:
        body.ctaLabel === null
          ? null
          : typeof body.ctaLabel === "string"
            ? body.ctaLabel
            : undefined,
      ctaHref:
        body.ctaHref === null
          ? null
          : typeof body.ctaHref === "string"
            ? body.ctaHref
            : undefined,
      ctaStyle: isButtonStyle(body.ctaStyle) ? body.ctaStyle : undefined,
    });

    return NextResponse.json({ header });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
