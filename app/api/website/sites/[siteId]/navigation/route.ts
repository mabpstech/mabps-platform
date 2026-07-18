import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { listNavItems, replaceNavItems } from "@/lib/website/repository";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({ navigation: listNavItems(siteId) });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const body = (await request.json()) as { items?: unknown };

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "items array is required." },
        { status: 400 },
      );
    }

    const items = body.items.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`Invalid navigation item at index ${index}.`);
      }
      const record = item as Record<string, unknown>;
      if (typeof record.label !== "string" || !record.label.trim()) {
        throw new Error(`Navigation item ${index + 1} needs a label.`);
      }
      return {
        label: record.label,
        href: typeof record.href === "string" ? record.href : null,
        pageId: typeof record.pageId === "string" ? record.pageId : null,
        openInNewTab: Boolean(record.openInNewTab),
      };
    });

    const navigation = replaceNavItems(siteId, items);
    return NextResponse.json({ navigation });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
