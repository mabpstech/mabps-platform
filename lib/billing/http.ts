import { platformErrorResponse } from "@/lib/platform/http";

export function billingErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "billing",
    fallback: "Unexpected billing error.",
  });
}
