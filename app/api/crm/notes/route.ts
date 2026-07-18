import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse, parseListFilters } from "@/lib/crm/http";
import { createNote, listNotes } from "@/lib/crm/repository";
import type { CrmEntityType } from "@/lib/crm/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const searchParams = new URL(request.url).searchParams;
    const filters = parseListFilters(searchParams);
    const notes = listNotes(workspace.id, {
      ...filters,
      entityType:
        (searchParams.get("entityType") as CrmEntityType | null) || undefined,
      entityId: searchParams.get("entityId") || undefined,
    });
    return NextResponse.json({ notes });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.entityType !== "string" || typeof body.entityId !== "string") {
      return NextResponse.json(
        { error: "entityType and entityId are required." },
        { status: 400 },
      );
    }
    if (typeof body.body !== "string" || !body.body.trim()) {
      return NextResponse.json(
        { error: "Note body is required." },
        { status: 400 },
      );
    }

    const note = createNote({
      workspaceId: workspace.id,
      entityType: body.entityType as CrmEntityType,
      entityId: body.entityId,
      body: body.body,
      createdByUserId: session.user.id,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
