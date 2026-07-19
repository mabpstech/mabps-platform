import { NextResponse } from "next/server";
import {
  ensureChatbotReady,
  getBotByPublicKey,
  getWidgetByBotId,
} from "@/lib/chatbot/repository";
import { enforcePublicRateLimit } from "@/lib/platform/rate-limit";

type RouteContext = { params: Promise<{ publicKey: string }> };

export async function GET(request: Request, context: RouteContext) {
  const limited = enforcePublicRateLimit(request, "chatbot");
  if (limited) return limited;

  ensureChatbotReady();
  const { publicKey } = await context.params;
  const bot = getBotByPublicKey(publicKey);
  if (!bot || bot.status !== "active") {
    return new NextResponse("// chatbot not found", {
      status: 404,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
  const widget = getWidgetByBotId(bot.id);
  if (!widget?.isEnabled) {
    return new NextResponse("// widget disabled", {
      status: 404,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const origin = new URL(request.url).origin;
  const embedUrl = `${origin}/embed/chatbot/${encodeURIComponent(publicKey)}`;
  const position =
    widget.position === "bottom-left" ? "left:20px;" : "right:20px;";
  const color = widget.primaryColor.replace(/[^#a-zA-Z0-9(),.%\s-]/g, "");
  const label = JSON.stringify(widget.launcherLabel || "Chat");

  const script = `
(function(){
  if (window.__mabpsChatbotLoaded) return;
  window.__mabpsChatbotLoaded = true;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", ${label});
  btn.textContent = ${label};
  btn.style.cssText = "position:fixed;bottom:20px;${position}z-index:2147483000;border:0;border-radius:999px;padding:12px 18px;background:${color};color:#fff;font:600 14px/1.2 system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.18);";
  var frame = document.createElement("iframe");
  frame.src = ${JSON.stringify(embedUrl)};
  frame.title = ${JSON.stringify(widget.title)};
  frame.style.cssText = "position:fixed;bottom:76px;${position}width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 100px);border:0;border-radius:16px;z-index:2147483000;display:none;box-shadow:0 16px 48px rgba(0,0,0,.22);background:#fff;";
  var open = false;
  btn.addEventListener("click", function(){
    open = !open;
    frame.style.display = open ? "block" : "none";
  });
  document.body.appendChild(frame);
  document.body.appendChild(btn);
})();
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
