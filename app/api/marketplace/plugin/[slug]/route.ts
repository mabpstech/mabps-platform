import { NextResponse } from "next/server";
import { requireMarketplaceMemberApi } from "@/lib/marketplace/access";
import { marketplaceErrorResponse } from "@/lib/marketplace/http";
import { invokePluginApi } from "@/lib/marketplace/plugin-api";
import {
  getInstallWithListingBySlug,
  recordSandboxRun,
} from "@/lib/marketplace/repository";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { workspace } = await requireMarketplaceMemberApi();
    const { slug } = await params;
    const install = getInstallWithListingBySlug(workspace.id, slug);
    if (!install) {
      return NextResponse.json(
        { error: "Installed plugin not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action =
      typeof body.action === "string" && body.action.trim()
        ? body.action.trim()
        : "ping";
    const input =
      body.input && typeof body.input === "object"
        ? (body.input as Record<string, unknown>)
        : {};

    const started = Date.now();
    const result = invokePluginApi({
      workspaceId: workspace.id,
      install,
      action,
      input,
    });

    recordSandboxRun({
      workspaceId: workspace.id,
      installId: install.id,
      listingId: install.listingId,
      hook: `api:${action}`,
      result: {
        status: result.ok ? "succeeded" : "failed",
        output: result.data ?? {},
        logs: Array.isArray(result.data?.logs)
          ? (result.data.logs as string[])
          : [],
        permissionsUsed: Array.isArray(result.data?.permissionsUsed)
          ? (result.data.permissionsUsed as never[])
          : [],
        errorMessage: result.error ?? null,
        durationMs:
          typeof result.data?.durationMs === "number"
            ? result.data.durationMs
            : Date.now() - started,
      },
      inputPayload: { action, input },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, data: result.data },
        { status: 403 },
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }
}
