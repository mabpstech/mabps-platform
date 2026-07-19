import { NextResponse } from "next/server";
import { requireWhatsAppMemberApi } from "@/lib/whatsapp/access";
import {
  parseWhatsAppListFilters,
  whatsappErrorResponse,
} from "@/lib/whatsapp/http";
import { createMedia, listMedia } from "@/lib/whatsapp/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      media: listMedia(workspace.id, parseWhatsAppListFilters(searchParams)),
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    const media = createMedia({
      workspaceId: workspace.id,
      providerMediaId:
        typeof body.providerMediaId === "string"
          ? body.providerMediaId
          : null,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : null,
      fileName: typeof body.fileName === "string" ? body.fileName : null,
      fileSize: typeof body.fileSize === "number" ? body.fileSize : null,
      sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : null,
      direction: body.direction === "inbound" ? "inbound" : "outbound",
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : {},
    });
    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
