import { NextResponse } from "next/server";
import { requireChatbotMemberApi } from "@/lib/chatbot/access";
import { getChannelProvider } from "@/lib/chatbot/channels";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  getBotById,
  listChannels,
  updateChannel,
} from "@/lib/chatbot/repository";
import type { ChannelStatus, ChatChannel } from "@/lib/chatbot/types";

type RouteContext = { params: Promise<{ botId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const { botId } = await context.params;
    const bot = getBotById(botId);
    if (!bot || bot.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    const channels = listChannels(botId).map((channel) => ({
      ...channel,
      providerImplemented: getChannelProvider(channel.channel).isImplemented,
    }));
    return NextResponse.json({ channels });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const { botId } = await context.params;
    const bot = getBotById(botId);
    if (!bot || bot.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.channel !== "string") {
      return NextResponse.json(
        { error: "channel is required." },
        { status: 400 },
      );
    }
    const channel = body.channel as ChatChannel;
    if (channel === "whatsapp" && body.status === "connected") {
      return NextResponse.json(
        {
          error:
            "WhatsApp Cloud API is not implemented yet. Provider interface is ready.",
        },
        { status: 501 },
      );
    }

    const updated = updateChannel(botId, workspace.id, channel, {
      status:
        typeof body.status === "string"
          ? (body.status as ChannelStatus)
          : undefined,
      config:
        body.config && typeof body.config === "object"
          ? (body.config as Record<string, unknown>)
          : undefined,
    });
    return NextResponse.json({
      channel: {
        ...updated,
        providerImplemented: getChannelProvider(updated.channel).isImplemented,
      },
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
