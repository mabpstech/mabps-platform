import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { createBlogPost, listBlogPosts } from "@/lib/website/repository";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({ posts: listBlogPosts(siteId) });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Post title is required." },
        { status: 400 },
      );
    }

    const post = createBlogPost({
      siteId,
      title: body.title,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      excerpt: typeof body.excerpt === "string" ? body.excerpt : null,
      content: typeof body.content === "string" ? body.content : "",
      authorName: typeof body.authorName === "string" ? body.authorName : null,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
