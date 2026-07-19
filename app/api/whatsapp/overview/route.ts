import { NextResponse } from "next/server";
import { requireWhatsAppMemberApi } from "@/lib/whatsapp/access";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { getWhatsAppOverview } from "@/lib/whatsapp/repository";

export async function GET() {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    return NextResponse.json({
      overview: getWhatsAppOverview(workspace.id),
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
