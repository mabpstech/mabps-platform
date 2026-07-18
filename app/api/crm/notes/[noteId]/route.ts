import { NextResponse } from "next/server";
import { requireCrmManagerApi, requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { deleteNote, updateNote } from "@/lib/crm/repository";

type RouteContext = { params: Promise<{ noteId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { noteId } = await context.params;
    const body = (await request.json()) as { body?: unknown };
    if (typeof body.body !== "string") {
      return NextResponse.json(
        { error: "Note body is required." },
        { status: 400 },
      );
    }
    const note = updateNote(noteId, workspace.id, body.body);
    return NextResponse.json({ note });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { noteId } = await context.params;
    deleteNote(noteId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
