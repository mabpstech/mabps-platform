import { NextResponse } from "next/server";
import { assertFeatureEntitlement } from "@/lib/billing/engine";
import { getWorkspacePlanId } from "@/lib/billing/entitlements";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import {
  buildDomainInstructions,
  setCustomDomain,
  verifyCustomDomain,
} from "@/lib/website/domain";
import { websiteErrorResponse } from "@/lib/website/http";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

function requireCustomDomainsEntitlement(workspaceId: string) {
  assertFeatureEntitlement(getWorkspacePlanId(workspaceId), "custom_domains");
}

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
      instructions: buildDomainInstructions(site),
      entitlement: (() => {
        try {
          requireCustomDomainsEntitlement(workspace.id);
          return { allowed: true as const };
        } catch (error) {
          return {
            allowed: false as const,
            message:
              error instanceof Error
                ? error.message
                : "Custom domains are not available on your plan.",
          };
        }
      })(),
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
    };

    if (body.customDomain === null || body.customDomain === "") {
      const site = setCustomDomain(siteId, null);
      return NextResponse.json({
        site,
        instructions: null,
      });
    }

    if (typeof body.customDomain !== "string") {
      return NextResponse.json(
        { error: "customDomain is required." },
        { status: 400 },
      );
    }

    requireCustomDomainsEntitlement(workspace.id);
    const site = setCustomDomain(siteId, body.customDomain);
    const instructions = buildDomainInstructions(site);
    return NextResponse.json({
      site,
      instructions,
      message: instructions
        ? `Add a TXT record on ${instructions.txtHost} with value ${instructions.txtValue}, then verify.`
        : "Custom domain updated.",
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

    if (body.action !== "verify") {
      return NextResponse.json(
        { error: "Unsupported action. Use action: \"verify\"." },
        { status: 400 },
      );
    }

    requireCustomDomainsEntitlement(workspace.id);
    const result = await verifyCustomDomain(siteId);
    if (!result.txtOk) {
      return NextResponse.json(
        {
          error: result.message,
          site: result.site,
          instructions: result.instructions,
          txtOk: false,
          cnameOk: false,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      site: result.site,
      message: result.message,
      instructions: result.instructions,
      txtOk: result.txtOk,
      cnameOk: result.cnameOk,
    });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
