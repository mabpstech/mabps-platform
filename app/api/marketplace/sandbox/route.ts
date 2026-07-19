import { NextResponse } from "next/server";
import {
  requireMarketplaceManagerApi,
  requireMarketplaceMemberApi,
} from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import {
  listSandboxRuns,
  runSandboxForInstall,
} from "@/lib/marketplace/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireMarketplaceMemberApi();
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    return NextResponse.json({
      runs: listSandboxRuns(workspace.id, {
        limit:
          typeof limit === "number" && Number.isFinite(limit)
            ? limit
            : undefined,
      }),
    });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireMarketplaceManagerApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.installId !== "string" || !body.installId.trim()) {
      return NextResponse.json(
        { error: "installId is required." },
        { status: 400 },
      );
    }
    if (typeof body.hook !== "string" || !body.hook.trim()) {
      return NextResponse.json({ error: "hook is required." }, { status: 400 });
    }

    const run = runSandboxForInstall({
      workspaceId: workspace.id,
      installId: body.installId.trim(),
      hook: body.hook.trim(),
      payload:
        body.payload && typeof body.payload === "object"
          ? (body.payload as Record<string, unknown>)
          : {},
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
