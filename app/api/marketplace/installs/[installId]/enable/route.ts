import { NextResponse } from "next/server";
import { requireMarketplaceManagerApi } from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import { enableMarketplaceInstall } from "@/lib/marketplace/repository";

type Params = { params: Promise<{ installId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    const { installId } = await params;
    const install = enableMarketplaceInstall({
      workspaceId: workspace.id,
      installId,
    });
    return NextResponse.json({ install });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
