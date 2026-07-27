import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import {
  deletePage,
  getPageById,
  listSections,
  replaceSections,
  updatePage,
} from "@/lib/website/repository";
import { parseSectionsPayload } from "@/lib/website/section-payload";
import { PAGE_STATUSES } from "@/lib/website/types";

type RouteContext = {
  params: Promise<{ siteId: string; pageId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId, pageId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const page = getPageById(pageId);
    if (!page || page.siteId !== siteId) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }
    return NextResponse.json({
      page,
      sections: listSections(pageId),
    });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, pageId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const page = getPageById(pageId);
    if (!page || page.siteId !== siteId) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const status =
      typeof body.status === "string" &&
      (PAGE_STATUSES as readonly string[]).includes(body.status)
        ? (body.status as (typeof PAGE_STATUSES)[number])
        : undefined;

    const updated = updatePage(pageId, {
      title: typeof body.title === "string" ? body.title : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      status,
      seoTitle:
        body.seoTitle === null
          ? null
          : typeof body.seoTitle === "string"
            ? body.seoTitle
            : undefined,
      seoDescription:
        body.seoDescription === null
          ? null
          : typeof body.seoDescription === "string"
            ? body.seoDescription
            : undefined,
      seoOgImageMediaId:
        body.seoOgImageMediaId === null
          ? null
          : typeof body.seoOgImageMediaId === "string"
            ? body.seoOgImageMediaId
            : undefined,
      seoRobots:
        body.seoRobots === null
          ? null
          : typeof body.seoRobots === "string"
            ? body.seoRobots
            : undefined,
      publishedAt:
        status === "published" ? new Date().toISOString() : undefined,
    });

    // Sections are saved on this registered page route so editors do not depend
    // on the nested `/sections` handler (which can 404 under Turbopack).
    let sections = listSections(pageId);
    if (body.sections !== undefined) {
      sections = replaceSections(pageId, parseSectionsPayload(body.sections));
    }

    return NextResponse.json({ page: updated, sections });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, pageId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const page = getPageById(pageId);
    if (!page || page.siteId !== siteId) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }
    deletePage(pageId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
