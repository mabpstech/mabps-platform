import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse, parseListFilters } from "@/lib/crm/http";
import { createTag, listTags } from "@/lib/crm/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const filters = parseListFilters(new URL(request.url).searchParams);
    const tags = listTags(workspace.id, filters);
    return NextResponse.json({ tags });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Tag name is required." },
        { status: 400 },
      );
    }

    const tag = createTag({
      workspaceId: workspace.id,
      name: body.name,
      color: typeof body.color === "string" ? body.color : undefined,
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
