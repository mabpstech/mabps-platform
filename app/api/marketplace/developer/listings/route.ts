import { NextResponse } from "next/server";
import { requireMarketplaceManagerApi } from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import { normalizePermissions } from "@/lib/marketplace/engine/permissions";
import {
  LISTING_KINDS,
  PRICING_MODELS,
  type ListingKind,
  type PricingModel,
} from "@/lib/marketplace/types";
import {
  listWorkspaceListings,
  publishWorkspaceListing,
} from "@/lib/marketplace/repository";

export async function GET() {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    return NextResponse.json({
      listings: listWorkspaceListings(workspace.id),
    });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    if (typeof body.slug !== "string" || !body.slug.trim()) {
      return NextResponse.json({ error: "slug is required." }, { status: 400 });
    }

    const kind =
      typeof body.kind === "string" &&
      (LISTING_KINDS as readonly string[]).includes(body.kind)
        ? (body.kind as ListingKind)
        : "plugin";

    const pricingModel =
      typeof body.pricingModel === "string" &&
      (PRICING_MODELS as readonly string[]).includes(body.pricingModel)
        ? (body.pricingModel as PricingModel)
        : "free";

    const listing = publishWorkspaceListing({
      workspaceId: workspace.id,
      kind,
      slug: body.slug,
      name: body.name,
      summary: typeof body.summary === "string" ? body.summary : undefined,
      description:
        typeof body.description === "string" ? body.description : undefined,
      pricingModel,
      priceCents:
        typeof body.priceCents === "number" ? body.priceCents : undefined,
      minPlanId: typeof body.minPlanId === "string" ? body.minPlanId : undefined,
      permissions: Array.isArray(body.permissions)
        ? normalizePermissions(body.permissions)
        : undefined,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((tag): tag is string => typeof tag === "string")
        : undefined,
      categories: Array.isArray(body.categories)
        ? body.categories.filter(
            (category): category is string => typeof category === "string",
          )
        : undefined,
      version: typeof body.version === "string" ? body.version : undefined,
      changelog: typeof body.changelog === "string" ? body.changelog : undefined,
      manifest:
        body.manifest && typeof body.manifest === "object"
          ? (body.manifest as never)
          : undefined,
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
