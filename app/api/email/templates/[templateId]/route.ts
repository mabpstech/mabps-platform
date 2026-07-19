import { NextResponse } from "next/server";
import {
  requireEmailManagerApi,
  requireEmailMemberApi,
} from "@/lib/email-engine/access";
import {
  emailErrorResponse,
  parseEmailTemplateCategory,
} from "@/lib/email-engine/http";
import {
  deleteTemplate,
  getTemplateById,
  updateTemplate,
} from "@/lib/email-engine/repository";

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireEmailMemberApi();
    const { templateId } = await params;
    const template = getTemplateById(templateId);
    if (!template || template.workspaceId !== workspace.id) {
      throw new Error("Template not found.");
    }
    return NextResponse.json({ template });
  } catch (error) {
    return emailErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { workspace } = await requireEmailManagerApi();
    const { templateId } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const template = updateTemplate(templateId, workspace.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      category: parseEmailTemplateCategory(body.category) || undefined,
      subject: typeof body.subject === "string" ? body.subject : undefined,
      html: typeof body.html === "string" ? body.html : undefined,
      text:
        typeof body.text === "string" || body.text === null
          ? (body.text as string | null)
          : undefined,
      variables: Array.isArray(body.variables)
        ? body.variables.map(String)
        : undefined,
      status:
        body.status === "active" ||
        body.status === "draft" ||
        body.status === "archived"
          ? body.status
          : undefined,
    });

    return NextResponse.json({ template });
  } catch (error) {
    return emailErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireEmailManagerApi();
    const { templateId } = await params;
    const existing = getTemplateById(templateId);
    if (!existing || existing.workspaceId !== workspace.id) {
      throw new Error("Template not found.");
    }
    deleteTemplate(templateId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
