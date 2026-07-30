import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { readExpectedUpdatedAt } from "@/lib/website/edit-conflict";
import {
  deleteForm,
  getFormById,
  getFormWithFields,
  replaceFormFields,
  updateForm,
} from "@/lib/website/repository";
import { FORM_STATUSES, isFormFieldType } from "@/lib/website/types";

type RouteContext = {
  params: Promise<{ siteId: string; formId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId, formId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const form = getFormWithFields(formId);
    if (!form || form.siteId !== siteId) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }
    return NextResponse.json({ form });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, formId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const existing = getFormById(formId);
    if (!existing || existing.siteId !== siteId) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const status =
      typeof body.status === "string" &&
      (FORM_STATUSES as readonly string[]).includes(body.status)
        ? (body.status as (typeof FORM_STATUSES)[number])
        : undefined;

    updateForm(formId, {
      name: typeof body.name === "string" ? body.name : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      description:
        body.description === null
          ? null
          : typeof body.description === "string"
            ? body.description
            : undefined,
      successMessage:
        typeof body.successMessage === "string"
          ? body.successMessage
          : undefined,
      notifyEmail:
        body.notifyEmail === null
          ? null
          : typeof body.notifyEmail === "string"
            ? body.notifyEmail
            : undefined,
      status,
      expectedUpdatedAt: readExpectedUpdatedAt(body),
    });

    if (Array.isArray(body.fields)) {
      const fields = body.fields.map((item, index) => {
        if (!item || typeof item !== "object") {
          throw new Error(`Invalid field at index ${index}.`);
        }
        const record = item as Record<string, unknown>;
        if (typeof record.label !== "string" || !record.label.trim()) {
          throw new Error(`Field ${index + 1} needs a label.`);
        }
        if (!isFormFieldType(record.fieldType)) {
          throw new Error(`Field ${index + 1} has an invalid type.`);
        }
        return {
          label: record.label,
          name:
            typeof record.name === "string" ? record.name : record.label,
          fieldType: record.fieldType,
          placeholder:
            typeof record.placeholder === "string"
              ? record.placeholder
              : null,
          required: Boolean(record.required),
          options: Array.isArray(record.options)
            ? record.options.map(String)
            : [],
        };
      });
      replaceFormFields(formId, fields);
    }

    return NextResponse.json({ form: getFormWithFields(formId) });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId, formId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const existing = getFormById(formId);
    if (!existing || existing.siteId !== siteId) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }
    deleteForm(formId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
