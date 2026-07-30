import { NextResponse } from "next/server";
import { enforcePublicRateLimit, getClientIp } from "@/lib/platform/rate-limit";
import {
  createFormSubmission,
  ensureWebsiteReady,
  getFormWithFields,
  getSiteById,
  hashIp,
} from "@/lib/website/repository";

type RouteContext = {
  params: Promise<{ formId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const limited = enforcePublicRateLimit(request, "form");
  if (limited) return limited;

  try {
    ensureWebsiteReady();
    const { formId } = await context.params;
    const form = getFormWithFields(formId);
    if (!form || form.status !== "active") {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }

    const site = getSiteById(form.siteId);
    if (!site || site.status !== "published") {
      return NextResponse.json({ error: "Form not available." }, { status: 404 });
    }

    const body = (await request.json()) as {
      values?: Record<string, unknown>;
      sourceUrl?: string;
    };

    const values = body.values && typeof body.values === "object" ? body.values : {};
    const payload: Record<string, unknown> = {};

    for (const field of form.fields) {
      const raw = values[field.name];
      if (
        field.required &&
        (raw === undefined || raw === null || String(raw).trim() === "")
      ) {
        return NextResponse.json(
          { error: `${field.label} is required.` },
          { status: 400 },
        );
      }
      if (raw !== undefined) {
        const asString = typeof raw === "string" ? raw : String(raw);
        if (asString.length > 5_000) {
          return NextResponse.json(
            { error: `${field.label} is too long.` },
            { status: 400 },
          );
        }
        payload[field.name] = asString;
      }
    }

    const ip = getClientIp(request);
    const submission = createFormSubmission({
      formId: form.id,
      siteId: form.siteId,
      payload,
      sourceUrl:
        typeof body.sourceUrl === "string"
          ? body.sourceUrl.slice(0, 2_000)
          : null,
      ipHash: hashIp(ip === "unknown" ? null : ip),
    });

    return NextResponse.json({
      ok: true,
      message: form.successMessage,
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("[website/form-submit]", error);
    return NextResponse.json(
      { error: "Unable to submit form." },
      { status: 500 },
    );
  }
}
