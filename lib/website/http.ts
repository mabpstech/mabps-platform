import { NextResponse } from "next/server";
import { EditConflictError } from "@/lib/website/edit-conflict";
import { platformErrorResponse } from "@/lib/platform/http";

export function websiteErrorResponse(error: unknown) {
  if (error instanceof EditConflictError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        currentUpdatedAt: error.currentUpdatedAt,
      },
      { status: 409 },
    );
  }

  return platformErrorResponse(error, {
    label: "website",
    fallback: "Unexpected website error.",
    extraRules: [
      {
        test: (message) =>
          message.includes("modified in another session") ||
          message.includes("edit conflict"),
        status: 409,
      },
    ],
  });
}
