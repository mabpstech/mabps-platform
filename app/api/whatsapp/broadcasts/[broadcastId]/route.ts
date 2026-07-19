import { NextResponse } from "next/server";
import {
  requireWhatsAppManagerApi,
  requireWhatsAppMemberApi,
} from "@/lib/whatsapp/access";
import { runWhatsAppBroadcast } from "@/lib/whatsapp/engine/broadcast";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import {
  getBroadcastById,
  listBroadcastRecipients,
} from "@/lib/whatsapp/repository";

type RouteContext = { params: Promise<{ broadcastId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const { broadcastId } = await context.params;
    const broadcast = getBroadcastById(broadcastId);
    if (!broadcast || broadcast.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Broadcast not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      broadcast,
      recipients: listBroadcastRecipients(broadcastId, workspace.id),
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWhatsAppManagerApi();
    const { broadcastId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (body.action !== "send") {
      return NextResponse.json(
        { error: "Unsupported action. Use action=send." },
        { status: 400 },
      );
    }
    const broadcast = await runWhatsAppBroadcast({
      workspaceId: workspace.id,
      broadcastId,
    });
    return NextResponse.json({ broadcast });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
