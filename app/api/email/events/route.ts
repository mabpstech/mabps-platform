import { NextResponse } from "next/server";
import { requireEmailMemberApi } from "@/lib/email-engine/access";
import { emailErrorResponse, parseEmailListFilters } from "@/lib/email-engine/http";
import {
  ensureWorkspaceEmail,
  listEmailEvents,
} from "@/lib/email-engine/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireEmailMemberApi();
    ensureWorkspaceEmail(workspace.id);
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      events: listEmailEvents(workspace.id, parseEmailListFilters(searchParams)),
    });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
