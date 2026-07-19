import { NextResponse } from "next/server";
import { requireEmailMemberApi } from "@/lib/email-engine/access";
import {
  syncAllEmailContactsToCrm,
  syncEmailContactToCrm,
} from "@/lib/email-engine/engine/crm-sync";
import { emailErrorResponse, parseEmailListFilters } from "@/lib/email-engine/http";
import {
  ensureWorkspaceEmail,
  listContacts,
  upsertContact,
} from "@/lib/email-engine/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireEmailMemberApi();
    ensureWorkspaceEmail(workspace.id);
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      contacts: listContacts(workspace.id, parseEmailListFilters(searchParams)),
    });
  } catch (error) {
    return emailErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireEmailMemberApi();
    ensureWorkspaceEmail(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "sync_crm") {
      if (typeof body.email === "string" && body.email.trim()) {
        const contact = syncEmailContactToCrm({
          workspaceId: workspace.id,
          email: body.email,
          name: typeof body.name === "string" ? body.name : null,
        });
        return NextResponse.json({ contact, synced: 1 });
      }
      const result = syncAllEmailContactsToCrm(workspace.id);
      return NextResponse.json(result);
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) throw new Error("email is required.");

    const contact = upsertContact({
      workspaceId: workspace.id,
      email,
      name: typeof body.name === "string" ? body.name : null,
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
