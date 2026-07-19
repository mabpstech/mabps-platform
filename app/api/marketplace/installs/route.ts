import { NextResponse } from "next/server";
import {
  requireMarketplaceManagerApi,
  requireMarketplaceMemberApi,
} from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import { normalizePermissions } from "@/lib/marketplace/engine/permissions";
import {
  installMarketplaceListing,
  listInstallsWithListings,
  listUpdatesAvailable,
} from "@/lib/marketplace/repository";

export async function GET() {
  try {
    const { workspace } = await requireMarketplaceMemberApi();
    return NextResponse.json({
      installs: listInstallsWithListings(workspace.id),
      updates: listUpdatesAvailable(workspace.id),
    });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireMarketplaceManagerApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.listingId !== "string" || !body.listingId.trim()) {
      return NextResponse.json(
        { error: "listingId is required." },
        { status: 400 },
      );
    }

    const install = installMarketplaceListing({
      workspaceId: workspace.id,
      listingId: body.listingId.trim(),
      userId: session.user.id,
      config:
        body.config && typeof body.config === "object"
          ? (body.config as Record<string, unknown>)
          : {},
      permissions: Array.isArray(body.permissions)
        ? normalizePermissions(body.permissions)
        : undefined,
    });

    return NextResponse.json({ install }, { status: 201 });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
