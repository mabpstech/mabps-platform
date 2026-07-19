import { NextResponse } from "next/server";
import {
  requireEmailManagerApi,
  requireEmailMemberApi,
} from "@/lib/email-engine/access";
import {
  emailErrorResponse,
  parseEmailListFilters,
} from "@/lib/email-engine/http";
import {
  createCampaign,
  ensureWorkspaceEmail,
  listCampaigns,
  listContacts,
} from "@/lib/email-engine/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireEmailMemberApi();
    ensureWorkspaceEmail(workspace.id);
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      campaigns: listCampaigns(
        workspace.id,
        parseEmailListFilters(searchParams),
      ),
    });
  } catch (error) {
    return emailErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireEmailManagerApi();
    ensureWorkspaceEmail(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    if (!name || !subject) throw new Error("name and subject are required.");

    let recipients: Array<{
      email: string;
      name?: string | null;
      contactId?: string | null;
    }> = [];

    if (body.allContacts === true) {
      recipients = listContacts(workspace.id, { status: "subscribed", limit: 500 }).map(
        (contact) => ({
          email: contact.email,
          name: contact.name,
          contactId: contact.id,
        }),
      );
    } else if (Array.isArray(body.recipients)) {
      recipients = body.recipients
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const item = row as Record<string, unknown>;
          const email = typeof item.email === "string" ? item.email : "";
          if (!email) return null;
          return {
            email,
            name: typeof item.name === "string" ? item.name : null,
            contactId:
              typeof item.contactId === "string" ? item.contactId : null,
          };
        })
        .filter(Boolean) as Array<{
        email: string;
        name?: string | null;
        contactId?: string | null;
      }>;
    }

    if (!recipients.length) {
      throw new Error("Add recipients or set allContacts=true.");
    }

    const campaign = createCampaign({
      workspaceId: workspace.id,
      name,
      subject,
      templateId:
        typeof body.templateId === "string" ? body.templateId : null,
      html: typeof body.html === "string" ? body.html : null,
      text: typeof body.text === "string" ? body.text : null,
      scheduledAt:
        typeof body.scheduledAt === "string" ? body.scheduledAt : null,
      createdByUserId: session.user.id,
      recipients,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
