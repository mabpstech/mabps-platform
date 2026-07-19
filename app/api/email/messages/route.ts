import { NextResponse } from "next/server";
import { requireEmailMemberApi } from "@/lib/email-engine/access";
import {
  sendMarketingEmail,
  sendTransactionalEmail,
} from "@/lib/email-engine/engine/send";
import {
  emailErrorResponse,
  parseEmailListFilters,
  parseEmailMessageKind,
} from "@/lib/email-engine/http";
import {
  ensureWorkspaceEmail,
  listMessages,
} from "@/lib/email-engine/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireEmailMemberApi();
    ensureWorkspaceEmail(workspace.id);
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      messages: listMessages(workspace.id, parseEmailListFilters(searchParams)),
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

    const to = typeof body.to === "string" ? body.to.trim() : "";
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    if (!to || !subject) throw new Error("to and subject are required.");

    const kind = parseEmailMessageKind(body.kind) || "transactional";
    const payload = {
      to,
      toName: typeof body.toName === "string" ? body.toName : null,
      subject,
      html: typeof body.html === "string" ? body.html : undefined,
      text: typeof body.text === "string" ? body.text : undefined,
      replyTo: typeof body.replyTo === "string" ? body.replyTo : null,
      templateId: typeof body.templateId === "string" ? body.templateId : null,
      variables:
        body.variables && typeof body.variables === "object"
          ? Object.fromEntries(
              Object.entries(body.variables as Record<string, unknown>).map(
                ([key, value]) => [key, String(value ?? "")],
              ),
            )
          : undefined,
    };

    const message =
      kind === "marketing"
        ? await sendMarketingEmail(workspace.id, payload)
        : await sendTransactionalEmail(workspace.id, payload);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
