import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { getFooterBySiteId, updateFooter } from "@/lib/website/repository";
import type { FooterColumn, FooterSocialLink } from "@/lib/website/types";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({ footer: getFooterBySiteId(siteId) });
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

    const footer = updateFooter(siteId, {
      copyrightText:
        body.copyrightText === null
          ? null
          : typeof body.copyrightText === "string"
            ? body.copyrightText
            : undefined,
      showSocial:
        typeof body.showSocial === "boolean" ? body.showSocial : undefined,
      socialLinks: Array.isArray(body.socialLinks)
        ? (body.socialLinks as FooterSocialLink[])
        : undefined,
      columns: Array.isArray(body.columns)
        ? (body.columns as FooterColumn[])
        : undefined,
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
    });

    return NextResponse.json({ footer });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
