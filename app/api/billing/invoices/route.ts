import { NextResponse } from "next/server";
import { requireBillingManagerApi } from "@/lib/billing/access";
import { billingErrorResponse } from "@/lib/billing/http";
import { getWorkspaceInvoices } from "@/lib/billing/invoices";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireBillingManagerApi();
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "1";

    const invoices = await getWorkspaceInvoices(workspace.id, {
      refresh,
      limit: 50,
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
