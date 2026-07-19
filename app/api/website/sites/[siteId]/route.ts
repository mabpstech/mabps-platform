import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { getSiteBundle } from "@/lib/website/repository";
import {
  deleteWorkspaceSite,
  updateWorkspaceSite,
} from "@/lib/website/sites";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const bundle = getSiteBundle(siteId);
    if (!bundle) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }
    return NextResponse.json(bundle);
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const body = (await request.json()) as {
      name?: unknown;
      slug?: unknown;
    };

    const site = updateWorkspaceSite(siteId, workspace.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
    });

    return NextResponse.json({ site });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    await deleteWorkspaceSite(siteId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
