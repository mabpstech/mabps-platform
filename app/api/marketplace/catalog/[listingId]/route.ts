import { NextResponse } from "next/server";
import { requireMarketplaceMemberApi } from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import {
  getInstallByWorkspaceListing,
  getListingById,
  listListingVersions,
} from "@/lib/marketplace/repository";

type Params = { params: Promise<{ listingId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireMarketplaceMemberApi();
    const { listingId } = await params;
    const listing = getListingById(listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    if (
      listing.visibility === "workspace" &&
      listing.publisherWorkspaceId !== workspace.id
    ) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    return NextResponse.json({
      listing,
      versions: listListingVersions(listing.id),
      install: getInstallByWorkspaceListing(workspace.id, listing.id),
    });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
