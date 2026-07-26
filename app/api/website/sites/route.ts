import { NextResponse } from "next/server";
import {
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import {
  createWorkspaceSite,
  listWorkspaceSites,
} from "@/lib/website/sites";
import {
  isSiteCategoryId,
  isSiteTemplateId,
} from "@/lib/website/templates";

export async function GET() {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const sites = listWorkspaceSites(workspace.id);
    return NextResponse.json({ sites });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const body = (await request.json()) as {
      name?: unknown;
      slug?: unknown;
      template?: unknown;
      category?: unknown;
    };

    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Site name is required." },
        { status: 400 },
      );
    }

    const site = createWorkspaceSite({
      workspaceId: workspace.id,
      name: body.name,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      template: isSiteTemplateId(body.template) ? body.template : "classic",
      category: isSiteCategoryId(body.category) ? body.category : "other",
    });

    return NextResponse.json({ site }, { status: 201 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
