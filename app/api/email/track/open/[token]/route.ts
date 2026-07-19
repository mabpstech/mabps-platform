import { NextResponse } from "next/server";
import {
  getTrackingPixelBuffer,
  trackOpen,
} from "@/lib/email-engine/engine/tracking";
import { enforcePublicRateLimit } from "@/lib/platform/rate-limit";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = enforcePublicRateLimit(request, "tracking");
  if (limited) return limited;

  const { token } = await params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip");
  try {
    trackOpen({
      token,
      userAgent: request.headers.get("user-agent"),
      ip,
    });
  } catch (error) {
    console.error("[email-engine:track-open]", error);
  }

  return new NextResponse(new Uint8Array(getTrackingPixelBuffer()), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
