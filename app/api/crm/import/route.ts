import { NextResponse } from "next/server";
import { requireCrmManagerApi } from "@/lib/crm/access";
import { importCrmCsv } from "@/lib/crm/csv";
import { crmErrorResponse } from "@/lib/crm/http";
import type { CrmExportEntity } from "@/lib/crm/types";

const ENTITIES: CrmExportEntity[] = [
  "companies",
  "contacts",
  "leads",
  "customers",
  "deals",
];

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireCrmManagerApi();
    const contentType = request.headers.get("content-type") || "";

    let entity: CrmExportEntity | null = null;
    let csvText = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const entityValue = form.get("entity");
      const file = form.get("file");
      entity =
        typeof entityValue === "string"
          ? (entityValue as CrmExportEntity)
          : null;
      if (file instanceof File) {
        csvText = await file.text();
      }
    } else {
      const body = (await request.json()) as {
        entity?: unknown;
        csv?: unknown;
      };
      entity = typeof body.entity === "string" ? (body.entity as CrmExportEntity) : null;
      csvText = typeof body.csv === "string" ? body.csv : "";
    }

    if (!entity || !ENTITIES.includes(entity)) {
      return NextResponse.json(
        {
          error:
            "entity must be one of: companies, contacts, leads, customers, deals.",
        },
        { status: 400 },
      );
    }
    if (!csvText.trim()) {
      return NextResponse.json(
        { error: "CSV content is required." },
        { status: 400 },
      );
    }

    const result = importCrmCsv({
      workspaceId: workspace.id,
      entity,
      csvText,
      actorUserId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return crmErrorResponse(error);
  }
}
