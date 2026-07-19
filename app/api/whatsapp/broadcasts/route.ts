import { NextResponse } from "next/server";
import {
  requireWhatsAppManagerApi,
  requireWhatsAppMemberApi,
} from "@/lib/whatsapp/access";
import {
  parseWhatsAppListFilters,
  whatsappErrorResponse,
} from "@/lib/whatsapp/http";
import {
  createBroadcast,
  listBroadcasts,
  listContacts,
} from "@/lib/whatsapp/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      broadcasts: listBroadcasts(
        workspace.id,
        parseWhatsAppListFilters(searchParams),
      ),
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, workspace } = await requireWhatsAppManagerApi();
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const templateName =
      typeof body.templateName === "string" ? body.templateName.trim() : "";
    if (!name || !templateName) {
      return NextResponse.json(
        { error: "name and templateName are required." },
        { status: 400 },
      );
    }

    let recipients: Array<{ phone: string; contactId?: string | null }> = [];
    if (body.allContacts === true) {
      recipients = listContacts(workspace.id, { limit: 500 }).map((contact) => ({
        phone: contact.phone,
        contactId: contact.id,
      }));
    } else if (Array.isArray(body.recipients)) {
      recipients = body.recipients
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const item = row as Record<string, unknown>;
          if (typeof item.phone !== "string") return null;
          return {
            phone: item.phone,
            contactId:
              typeof item.contactId === "string" ? item.contactId : null,
          };
        })
        .filter((row): row is { phone: string; contactId: string | null } =>
          Boolean(row),
        );
    }

    const broadcast = createBroadcast({
      workspaceId: workspace.id,
      name,
      templateName,
      templateLanguage:
        typeof body.templateLanguage === "string"
          ? body.templateLanguage
          : "en_US",
      templateParams: Array.isArray(body.templateParams)
        ? body.templateParams.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      scheduledAt:
        typeof body.scheduledAt === "string" ? body.scheduledAt : null,
      createdByUserId: session.user.id,
      recipients,
    });

    return NextResponse.json({ broadcast }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
