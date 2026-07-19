import { NextResponse } from "next/server";
import {
  requireEmailManagerApi,
  requireEmailMemberApi,
} from "@/lib/email-engine/access";
import {
  emailErrorResponse,
  parseEmailListFilters,
  parseEmailTemplateCategory,
} from "@/lib/email-engine/http";
import {
  createTemplate,
  ensureWorkspaceEmail,
  listTemplates,
} from "@/lib/email-engine/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireEmailMemberApi();
    ensureWorkspaceEmail(workspace.id);
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      templates: listTemplates(
        workspace.id,
        parseEmailListFilters(searchParams),
      ),
    });
  } catch (error) {
    return emailErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireEmailManagerApi();
    ensureWorkspaceEmail(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    const html = typeof body.html === "string" ? body.html : "";
    if (!name || !subject || !html) {
      throw new Error("name, subject, and html are required.");
    }

    const template = createTemplate({
      workspaceId: workspace.id,
      name,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      category: parseEmailTemplateCategory(body.category) || "transactional",
      subject,
      html,
      text: typeof body.text === "string" ? body.text : null,
      variables: Array.isArray(body.variables)
        ? body.variables.map(String)
        : undefined,
      status:
        body.status === "draft" || body.status === "archived"
          ? body.status
          : "active",
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
