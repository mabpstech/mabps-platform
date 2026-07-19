import { NextResponse } from "next/server";
import { requireWhatsAppMemberApi } from "@/lib/whatsapp/access";
import { syncAllWhatsAppContactsToCrm } from "@/lib/whatsapp/engine/crm-sync";
import {
  parseWhatsAppListFilters,
  whatsappErrorResponse,
} from "@/lib/whatsapp/http";
import { listContacts } from "@/lib/whatsapp/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      contacts: listContacts(
        workspace.id,
        parseWhatsAppListFilters(searchParams),
      ),
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "sync_crm") {
      const result = syncAllWhatsAppContactsToCrm(workspace.id);
      return NextResponse.json(result);
    }
    return NextResponse.json(
      { error: "Unsupported action. Use action=sync_crm." },
      { status: 400 },
    );
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
