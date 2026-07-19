import { NextResponse } from "next/server";
import { requireEmailMemberApi } from "@/lib/email-engine/access";
import { emailErrorResponse } from "@/lib/email-engine/http";
import { getEmailOverview } from "@/lib/email-engine/repository";

export async function GET() {
  try {
    const { workspace } = await requireEmailMemberApi();
    return NextResponse.json({
      overview: getEmailOverview(workspace.id),
    });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
