import { platformErrorResponse } from "@/lib/platform/http";

export function websiteErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "website",
    fallback: "Unexpected website error.",
  });
}
