import { NextResponse } from "next/server";
import { requireWhatsAppMemberApi } from "@/lib/whatsapp/access";
import {
  sendWhatsAppMedia,
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@/lib/whatsapp/engine/outbound";
import {
  parseWhatsAppListFilters,
  whatsappErrorResponse,
} from "@/lib/whatsapp/http";
import { listMessages } from "@/lib/whatsapp/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      messages: listMessages(
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
    const { workspace } = await requireWhatsAppMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    const to = typeof body.to === "string" ? body.to.trim() : "";
    if (!to) {
      return NextResponse.json({ error: "to is required." }, { status: 400 });
    }

    const kind =
      typeof body.kind === "string"
        ? body.kind
        : typeof body.templateName === "string"
          ? "template"
          : typeof body.mediaType === "string"
            ? "media"
            : "text";

    if (kind === "template") {
      const templateName =
        typeof body.templateName === "string" ? body.templateName.trim() : "";
      if (!templateName) {
        return NextResponse.json(
          { error: "templateName is required for template messages." },
          { status: 400 },
        );
      }
      const message = await sendWhatsAppTemplate({
        workspaceId: workspace.id,
        to,
        templateName,
        language:
          typeof body.language === "string" ? body.language : undefined,
        bodyParams: Array.isArray(body.bodyParams)
          ? body.bodyParams.filter((value): value is string => typeof value === "string")
          : undefined,
      });
      return NextResponse.json({ message }, { status: 201 });
    }

    if (kind === "media") {
      const mediaType = body.mediaType;
      if (
        mediaType !== "image" &&
        mediaType !== "audio" &&
        mediaType !== "video" &&
        mediaType !== "document"
      ) {
        return NextResponse.json(
          { error: "mediaType must be image, audio, video, or document." },
          { status: 400 },
        );
      }
      const message = await sendWhatsAppMedia({
        workspaceId: workspace.id,
        to,
        type: mediaType,
        link: typeof body.link === "string" ? body.link : undefined,
        mediaId: typeof body.mediaId === "string" ? body.mediaId : undefined,
        caption: typeof body.caption === "string" ? body.caption : undefined,
        filename:
          typeof body.filename === "string" ? body.filename : undefined,
      });
      return NextResponse.json({ message }, { status: 201 });
    }

    const text = typeof body.text === "string" ? body.text : typeof body.message === "string" ? body.message : "";
    if (!text.trim()) {
      return NextResponse.json(
        { error: "text is required for text messages." },
        { status: 400 },
      );
    }
    const message = await sendWhatsAppText({
      workspaceId: workspace.id,
      to,
      text,
      previewUrl: body.previewUrl === true,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
