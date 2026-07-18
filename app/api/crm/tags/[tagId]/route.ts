import { NextResponse } from "next/server";
import { requireCrmManagerApi, requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { deleteTag, updateTag } from "@/lib/crm/repository";

type RouteContext = { params: Promise<{ tagId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { tagId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const tag = updateTag(tagId, workspace.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
    });
    return NextResponse.json({ tag });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { tagId } = await context.params;
    deleteTag(tagId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
