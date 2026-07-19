import { NextResponse } from "next/server";
import {
  requireWhatsAppManagerApi,
  requireWhatsAppMemberApi,
} from "@/lib/whatsapp/access";
import { syncWhatsAppTemplates } from "@/lib/whatsapp/engine/templates";
import {
  parseWhatsAppListFilters,
  whatsappErrorResponse,
} from "@/lib/whatsapp/http";
import {
  listTemplates,
  upsertTemplate,
} from "@/lib/whatsapp/repository";
import {
  WHATSAPP_TEMPLATE_STATUSES,
  type WhatsAppTemplateStatus,
} from "@/lib/whatsapp/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      templates: listTemplates(
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
    const { workspace } = await requireWhatsAppManagerApi();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "sync") {
      const result = await syncWhatsAppTemplates(workspace.id);
      return NextResponse.json(result);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }

    const status =
      typeof body.status === "string" &&
      WHATSAPP_TEMPLATE_STATUSES.includes(body.status as WhatsAppTemplateStatus)
        ? (body.status as WhatsAppTemplateStatus)
        : "LOCAL";

    const template = upsertTemplate({
      workspaceId: workspace.id,
      name,
      language: typeof body.language === "string" ? body.language : "en_US",
      category: typeof body.category === "string" ? body.category : null,
      status,
      body: typeof body.body === "string" ? body.body : null,
      components: Array.isArray(body.components) ? body.components : [],
      isLocal: true,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
