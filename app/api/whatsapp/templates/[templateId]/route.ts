import { NextResponse } from "next/server";
import { requireWhatsAppManagerApi } from "@/lib/whatsapp/access";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import {
  deleteTemplate,
  getTemplateById,
  upsertTemplate,
} from "@/lib/whatsapp/repository";
import {
  WHATSAPP_TEMPLATE_STATUSES,
  type WhatsAppTemplateStatus,
} from "@/lib/whatsapp/types";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWhatsAppManagerApi();
    const { templateId } = await context.params;
    const existing = getTemplateById(templateId);
    if (!existing || existing.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Template not found." },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const status =
      typeof body.status === "string" &&
      WHATSAPP_TEMPLATE_STATUSES.includes(body.status as WhatsAppTemplateStatus)
        ? (body.status as WhatsAppTemplateStatus)
        : existing.status;

    const template = upsertTemplate({
      workspaceId: workspace.id,
      name: typeof body.name === "string" ? body.name : existing.name,
      language:
        typeof body.language === "string" ? body.language : existing.language,
      category:
        typeof body.category === "string" || body.category === null
          ? (body.category as string | null)
          : existing.category,
      status,
      body:
        typeof body.body === "string" || body.body === null
          ? (body.body as string | null)
          : existing.body,
      components: Array.isArray(body.components)
        ? body.components
        : existing.components,
      providerTemplateId: existing.providerTemplateId,
      isLocal: existing.isLocal,
    });
    return NextResponse.json({ template });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWhatsAppManagerApi();
    const { templateId } = await context.params;
    deleteTemplate(templateId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
