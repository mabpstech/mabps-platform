import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { readExpectedUpdatedAt } from "@/lib/website/edit-conflict";
import {
  deleteBlogPost,
  getBlogPostById,
  updateBlogPost,
} from "@/lib/website/repository";
import { BLOG_STATUSES } from "@/lib/website/types";

type RouteContext = {
  params: Promise<{ siteId: string; postId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId, postId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const post = getBlogPostById(postId);
    if (!post || post.siteId !== siteId) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, postId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const post = getBlogPostById(postId);
    if (!post || post.siteId !== siteId) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const status =
      typeof body.status === "string" &&
      (BLOG_STATUSES as readonly string[]).includes(body.status)
        ? (body.status as (typeof BLOG_STATUSES)[number])
        : undefined;

    const updated = updateBlogPost(postId, {
      title: typeof body.title === "string" ? body.title : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      excerpt:
        body.excerpt === null
          ? null
          : typeof body.excerpt === "string"
            ? body.excerpt
            : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
      coverMediaId:
        body.coverMediaId === null
          ? null
          : typeof body.coverMediaId === "string"
            ? body.coverMediaId
            : undefined,
      authorName:
        body.authorName === null
          ? null
          : typeof body.authorName === "string"
            ? body.authorName
            : undefined,
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
      expectedUpdatedAt: readExpectedUpdatedAt(body),
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, postId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const post = getBlogPostById(postId);
    if (!post || post.siteId !== siteId) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    deleteBlogPost(postId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
