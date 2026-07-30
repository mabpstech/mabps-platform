import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { readExpectedUpdatedAt } from "@/lib/website/edit-conflict";
import { getThemeBySiteId, updateTheme } from "@/lib/website/repository";
import { normalizeThemeTokens } from "@/lib/website/theme/normalize";
import { isButtonStyle } from "@/lib/website/types";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({ theme: getThemeBySiteId(siteId) });
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

    const hasTokens = body.tokens !== undefined && body.tokens !== null;

    const theme = updateTheme(siteId, {
      ...(hasTokens
        ? {
            tokens: normalizeThemeTokens(body.tokens),
          }
        : {
            primaryColor:
              typeof body.primaryColor === "string"
                ? body.primaryColor
                : undefined,
            secondaryColor:
              typeof body.secondaryColor === "string"
                ? body.secondaryColor
                : undefined,
            backgroundColor:
              typeof body.backgroundColor === "string"
                ? body.backgroundColor
                : undefined,
            textColor:
              typeof body.textColor === "string" ? body.textColor : undefined,
            mutedColor:
              typeof body.mutedColor === "string" ? body.mutedColor : undefined,
            fontHeading:
              typeof body.fontHeading === "string"
                ? body.fontHeading
                : undefined,
            fontBody:
              typeof body.fontBody === "string" ? body.fontBody : undefined,
            borderRadius:
              typeof body.borderRadius === "string"
                ? body.borderRadius
                : undefined,
            buttonStyle: isButtonStyle(body.buttonStyle)
              ? body.buttonStyle
              : undefined,
            logoMediaId:
              body.logoMediaId === null
                ? null
                : typeof body.logoMediaId === "string"
                  ? body.logoMediaId
                  : undefined,
            faviconMediaId:
              body.faviconMediaId === null
                ? null
                : typeof body.faviconMediaId === "string"
                  ? body.faviconMediaId
                  : undefined,
          }),
      customCss:
        body.customCss === null
          ? null
          : typeof body.customCss === "string"
            ? body.customCss
            : undefined,
      expectedUpdatedAt: readExpectedUpdatedAt(body),
    });

    return NextResponse.json({ theme });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
