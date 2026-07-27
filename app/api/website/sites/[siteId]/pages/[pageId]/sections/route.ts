import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import {
  createSection,
  getPageById,
  listSections,
  replaceSections,
} from "@/lib/website/repository";
import { parseSectionsPayload } from "@/lib/website/section-payload";
import { isSectionType, type SectionSettings } from "@/lib/website/types";

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
    return NextResponse.json({ sections: listSections(pageId) });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, pageId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const page = getPageById(pageId);
    if (!page || page.siteId !== siteId) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      type?: unknown;
      content?: unknown;
      settings?: unknown;
    };

    if (!isSectionType(body.type)) {
      return NextResponse.json(
        { error: "Invalid section type." },
        { status: 400 },
      );
    }

    const section = createSection({
      pageId,
      type: body.type,
      content:
        body.content && typeof body.content === "object"
          ? (body.content as Record<string, unknown>)
          : undefined,
      settings:
        body.settings && typeof body.settings === "object"
          ? (body.settings as SectionSettings)
          : undefined,
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, pageId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const page = getPageById(pageId);
    if (!page || page.siteId !== siteId) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const body = (await request.json()) as { sections?: unknown };
    if (!Array.isArray(body.sections)) {
      return NextResponse.json(
        { error: "sections array is required." },
        { status: 400 },
      );
    }

    const saved = replaceSections(pageId, parseSectionsPayload(body.sections));
    return NextResponse.json({ sections: saved });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
