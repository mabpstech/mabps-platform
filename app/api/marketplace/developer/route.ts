import { NextResponse } from "next/server";
import {
  requireMarketplaceManagerApi,
  requireMarketplaceMemberApi,
} from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import { SDK_QUICKSTART } from "@/lib/marketplace/sdk";
import {
  ensureDeveloper,
  listApiKeys,
  listPurchases,
  listWorkspaceListings,
  upsertDeveloper,
} from "@/lib/marketplace/repository";

export async function GET() {
  try {
    const { workspace } = await requireMarketplaceMemberApi();
    const developer = ensureDeveloper(workspace.id, workspace.name);
    return NextResponse.json({
      developer,
      apiKeys: listApiKeys(workspace.id),
      listings: listWorkspaceListings(workspace.id),
      purchases: listPurchases(workspace.id),
      sdk: SDK_QUICKSTART,
    });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.displayName !== "string" || !body.displayName.trim()) {
      return NextResponse.json(
        { error: "displayName is required." },
        { status: 400 },
      );
    }

    const developer = upsertDeveloper({
      workspaceId: workspace.id,
      displayName: body.displayName,
      websiteUrl:
        typeof body.websiteUrl === "string" ? body.websiteUrl : null,
      supportEmail:
        typeof body.supportEmail === "string" ? body.supportEmail : null,
      bio: typeof body.bio === "string" ? body.bio : null,
    });

    return NextResponse.json({ developer });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
