import { NextResponse } from "next/server";
import { requireMarketplaceManagerApi } from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import { normalizeSdkScopes } from "@/lib/marketplace/sdk";
import {
  createApiKey,
  ensureDeveloper,
  listApiKeys,
  revokeApiKey,
} from "@/lib/marketplace/repository";

export async function GET() {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    ensureDeveloper(workspace.id, workspace.name);
    return NextResponse.json({ apiKeys: listApiKeys(workspace.id) });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    ensureDeveloper(workspace.id, workspace.name);
    const body = (await request.json()) as Record<string, unknown>;
    const apiKey = createApiKey({
      workspaceId: workspace.id,
      name: typeof body.name === "string" ? body.name : "SDK key",
      scopes: Array.isArray(body.scopes)
        ? normalizeSdkScopes(body.scopes)
        : undefined,
    });
    return NextResponse.json({ apiKey }, { status: 201 });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.keyId !== "string" || !body.keyId.trim()) {
      return NextResponse.json({ error: "keyId is required." }, { status: 400 });
    }
    const apiKey = revokeApiKey(workspace.id, body.keyId.trim());
    return NextResponse.json({ apiKey });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
