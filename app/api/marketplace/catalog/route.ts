import { NextResponse } from "next/server";
import { requireMarketplaceMemberApi } from "@/lib/marketplace/access";
import {
  marketplaceErrorResponse,
  parseMarketplaceCatalogFilters,
} from "@/lib/marketplace/http";
import { listCatalog } from "@/lib/marketplace/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireMarketplaceMemberApi();
    const { searchParams } = new URL(request.url);
    const filters = parseMarketplaceCatalogFilters(searchParams);
    return NextResponse.json({
      listings: listCatalog(workspace.id, filters),
    });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
