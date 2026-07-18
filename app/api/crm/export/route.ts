import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { exportCrmCsv } from "@/lib/crm/csv";
import { crmErrorResponse } from "@/lib/crm/http";
import type { CrmExportEntity } from "@/lib/crm/types";

const ENTITIES: CrmExportEntity[] = [
  "companies",
  "contacts",
  "leads",
  "customers",
  "deals",
];

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const entity = new URL(request.url).searchParams.get(
      "entity",
    ) as CrmExportEntity | null;

    if (!entity || !ENTITIES.includes(entity)) {
      return NextResponse.json(
        {
          error:
            "Query param entity must be one of: companies, contacts, leads, customers, deals.",
        },
        { status: 400 },
      );
    }

    const { filename, csv } = exportCrmCsv(workspace.id, entity);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
