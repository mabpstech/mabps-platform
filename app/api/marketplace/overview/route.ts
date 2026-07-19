import { NextResponse } from "next/server";
import { requireMarketplaceMemberApi } from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import {
  getMarketplaceOverview,
  listUpdatesAvailable,
} from "@/lib/marketplace/repository";

export async function GET() {
  try {
    const { workspace } = await requireMarketplaceMemberApi();
    return NextResponse.json({
      overview: getMarketplaceOverview(workspace.id),
      updates: listUpdatesAvailable(workspace.id),
    });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
