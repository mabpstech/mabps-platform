import { NextResponse } from "next/server";
import {
  requireMarketplaceManagerApi,
  requireMarketplaceMemberApi,
} from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import { normalizePermissions } from "@/lib/marketplace/engine/permissions";
import {
  getInstallById,
  listInstallsWithListings,
  uninstallMarketplaceListing,
  updateInstallConfig,
} from "@/lib/marketplace/repository";

type Params = { params: Promise<{ installId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireMarketplaceMemberApi();
    const { installId } = await params;
    const install = listInstallsWithListings(workspace.id).find(
      (row) => row.id === installId,
    );
    if (!install) {
      return NextResponse.json({ error: "Install not found." }, { status: 404 });
    }
    return NextResponse.json({ install });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    const { installId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const current = getInstallById(workspace.id, installId);
    if (!current) {
      return NextResponse.json({ error: "Install not found." }, { status: 404 });
    }

    const install = updateInstallConfig({
      workspaceId: workspace.id,
      installId,
      config:
        body.config && typeof body.config === "object"
          ? (body.config as Record<string, unknown>)
          : current.config,
      permissions: Array.isArray(body.permissions)
        ? normalizePermissions(body.permissions)
        : undefined,
    });

    return NextResponse.json({ install });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    const { installId } = await params;
    uninstallMarketplaceListing({
      workspaceId: workspace.id,
      installId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
