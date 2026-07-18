import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { getSiteById } from "@/lib/website/repository";
import {
  setCustomDomain,
  verifyCustomDomain,
} from "@/lib/website/publish";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    const site = await requireSiteForWorkspace(siteId, workspace.id);
    return NextResponse.json({
      customDomain: site.customDomain,
      domainVerified: site.domainVerified,
      domainVerificationToken: site.domainVerificationToken,
      status: site.status,
      publicPath: `/p/${site.slug}`,
    });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const body = (await request.json()) as {
      customDomain?: unknown;
      verify?: unknown;
    };

    if (body.verify === true) {
      const site = verifyCustomDomain(siteId, { force: true });
      return NextResponse.json({ site });
    }

    if (body.customDomain === null) {
      const site = setCustomDomain(siteId, null);
      return NextResponse.json({ site });
    }

    if (typeof body.customDomain !== "string") {
      return NextResponse.json(
        { error: "customDomain is required." },
        { status: 400 },
      );
    }

    const site = setCustomDomain(siteId, body.customDomain);
    return NextResponse.json({
      site,
      instructions: site.domainVerificationToken
        ? `Add a DNS TXT record on ${site.customDomain} with value: ${site.domainVerificationToken}`
        : null,
    });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
    };

    if (body.action === "verify") {
      const site = verifyCustomDomain(siteId, { force: true });
      return NextResponse.json({ site });
    }

    return NextResponse.json(
      { error: "Unsupported action.", site: getSiteById(siteId) },
      { status: 400 },
    );
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
