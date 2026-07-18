import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse, parseListFilters } from "@/lib/crm/http";
import { createContact, listContacts } from "@/lib/crm/repository";
import type { ContactStatus } from "@/lib/crm/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const filters = parseListFilters(new URL(request.url).searchParams);
    const contacts = listContacts(workspace.id, filters);
    return NextResponse.json({ contacts });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.firstName !== "string" || !body.firstName.trim()) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 },
      );
    }

    const contact = createContact({
      workspaceId: workspace.id,
      firstName: body.firstName,
      lastName: typeof body.lastName === "string" ? body.lastName : "",
      email: typeof body.email === "string" ? body.email : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      jobTitle: typeof body.jobTitle === "string" ? body.jobTitle : null,
      companyId: typeof body.companyId === "string" ? body.companyId : null,
      status:
        typeof body.status === "string"
          ? (body.status as ContactStatus)
          : "active",
      ownerUserId:
        typeof body.ownerUserId === "string"
          ? body.ownerUserId
          : session.user.id,
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
