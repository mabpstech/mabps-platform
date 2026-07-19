import { NextResponse } from "next/server";
import { requireWhatsAppMemberApi } from "@/lib/whatsapp/access";
import {
  parseWhatsAppListFilters,
  whatsappErrorResponse,
} from "@/lib/whatsapp/http";
import { listConversations } from "@/lib/whatsapp/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      conversations: listConversations(
        workspace.id,
        parseWhatsAppListFilters(searchParams),
      ),
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
