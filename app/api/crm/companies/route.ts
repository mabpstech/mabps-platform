import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse, parseListFilters } from "@/lib/crm/http";
import { createCompany, listCompanies } from "@/lib/crm/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const filters = parseListFilters(new URL(request.url).searchParams);
    const companies = listCompanies(workspace.id, filters);
    return NextResponse.json({ companies });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 },
      );
    }

    const company = createCompany({
      workspaceId: workspace.id,
      name: body.name,
      domain: typeof body.domain === "string" ? body.domain : null,
      industry: typeof body.industry === "string" ? body.industry : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      email: typeof body.email === "string" ? body.email : null,
      website: typeof body.website === "string" ? body.website : null,
      address: typeof body.address === "string" ? body.address : null,
      city: typeof body.city === "string" ? body.city : null,
      state: typeof body.state === "string" ? body.state : null,
      country: typeof body.country === "string" ? body.country : null,
      postalCode: typeof body.postalCode === "string" ? body.postalCode : null,
      description: typeof body.description === "string" ? body.description : null,
      ownerUserId:
        typeof body.ownerUserId === "string"
          ? body.ownerUserId
          : session.user.id,
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
