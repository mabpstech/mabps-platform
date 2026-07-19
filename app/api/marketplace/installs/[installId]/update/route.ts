import { NextResponse } from "next/server";
import { requireMarketplaceManagerApi } from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import { updateMarketplaceInstall } from "@/lib/marketplace/repository";

type Params = { params: Promise<{ installId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    const { installId } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const install = updateMarketplaceInstall({
      workspaceId: workspace.id,
      installId,
      versionId:
        typeof body.versionId === "string" ? body.versionId : undefined,
    });
    return NextResponse.json({ install });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
