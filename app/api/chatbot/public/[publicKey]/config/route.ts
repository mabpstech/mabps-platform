import { NextResponse } from "next/server";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  ensureChatbotReady,
  getBotByPublicKey,
  getWidgetByBotId,
} from "@/lib/chatbot/repository";

type RouteContext = { params: Promise<{ publicKey: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    ensureChatbotReady();
    const { publicKey } = await context.params;
    const bot = getBotByPublicKey(publicKey);
    if (!bot || bot.status !== "active") {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    const widget = getWidgetByBotId(bot.id);
    if (!widget?.isEnabled) {
      return NextResponse.json(
        { error: "Widget is disabled." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      bot: {
        name: bot.name,
        welcomeMessage: bot.welcomeMessage,
        leadCaptureEnabled: bot.leadCaptureEnabled,
        handoffEnabled: bot.handoffEnabled,
      },
      widget: {
        title: widget.title,
        primaryColor: widget.primaryColor,
        position: widget.position,
        launcherLabel: widget.launcherLabel,
      },
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
