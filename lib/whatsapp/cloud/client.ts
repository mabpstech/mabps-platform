import {
  DEFAULT_WHATSAPP_API_VERSION,
  graphBaseUrl,
  normalizePhone,
} from "@/lib/whatsapp/defaults";
import type {
  WhatsAppCloudCredentials,
  WhatsAppCloudSendResult,
  WhatsAppSendMediaInput,
  WhatsAppSendTemplateInput,
  WhatsAppSendTextInput,
} from "@/lib/whatsapp/types";

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function requireCredentials(
  credentials: WhatsAppCloudCredentials,
): Required<Pick<WhatsAppCloudCredentials, "phoneNumberId" | "accessToken">> &
  WhatsAppCloudCredentials {
  const phoneNumberId = credentials.phoneNumberId?.trim();
  const accessToken = credentials.accessToken?.trim();
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WhatsApp Cloud API credentials are incomplete. Configure phoneNumberId and accessToken.",
    );
  }
  return { ...credentials, phoneNumberId, accessToken };
}

async function graphRequest(
  credentials: WhatsAppCloudCredentials,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const creds = requireCredentials(credentials);
  const version = creds.apiVersion || DEFAULT_WHATSAPP_API_VERSION;
  const url = path.startsWith("http")
    ? path
    : `${graphBaseUrl(version)}${path.startsWith("/") ? "" : "/"}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await response.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  return { ok: response.ok, status: response.status, json };
}

function extractError(json: Record<string, unknown>): string {
  const body = json as GraphErrorBody;
  return body.error?.message || "WhatsApp Cloud API request failed.";
}

function extractMessageId(json: Record<string, unknown>): string | undefined {
  const messages = json.messages;
  if (!Array.isArray(messages) || !messages[0]) return undefined;
  const first = messages[0] as { id?: string };
  return typeof first.id === "string" ? first.id : undefined;
}

export async function sendTextMessage(
  credentials: WhatsAppCloudCredentials,
  input: WhatsAppSendTextInput,
): Promise<WhatsAppCloudSendResult> {
  const creds = requireCredentials(credentials);
  const to = normalizePhone(input.to);
  if (!to || !input.text.trim()) {
    return { ok: false, error: "sendTextMessage requires to and text." };
  }

  const { ok, json } = await graphRequest(
    creds,
    `/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: Boolean(input.previewUrl),
          body: input.text,
        },
      }),
    },
  );

  if (!ok) return { ok: false, error: extractError(json), raw: json };
  return {
    ok: true,
    providerMessageId: extractMessageId(json),
    raw: json,
  };
}

export async function sendTemplateMessage(
  credentials: WhatsAppCloudCredentials,
  input: WhatsAppSendTemplateInput,
): Promise<WhatsAppCloudSendResult> {
  const creds = requireCredentials(credentials);
  const to = normalizePhone(input.to);
  if (!to || !input.templateName.trim()) {
    return {
      ok: false,
      error: "sendTemplateMessage requires to and templateName.",
    };
  }

  const bodyParams = input.bodyParams || [];
  const components =
    bodyParams.length > 0
      ? [
          {
            type: "body",
            parameters: bodyParams.map((text) => ({ type: "text", text })),
          },
        ]
      : undefined;

  const { ok, json } = await graphRequest(
    creds,
    `/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.language || "en_US" },
          ...(components ? { components } : {}),
        },
      }),
    },
  );

  if (!ok) return { ok: false, error: extractError(json), raw: json };
  return {
    ok: true,
    providerMessageId: extractMessageId(json),
    raw: json,
  };
}

export async function sendMediaMessage(
  credentials: WhatsAppCloudCredentials,
  input: WhatsAppSendMediaInput,
): Promise<WhatsAppCloudSendResult> {
  const creds = requireCredentials(credentials);
  const to = normalizePhone(input.to);
  if (!to || (!input.link && !input.mediaId)) {
    return {
      ok: false,
      error: "sendMediaMessage requires to and either link or mediaId.",
    };
  }

  const mediaPayload: Record<string, unknown> = {};
  if (input.mediaId) mediaPayload.id = input.mediaId;
  if (input.link) mediaPayload.link = input.link;
  if (input.caption && input.type !== "audio") {
    mediaPayload.caption = input.caption;
  }
  if (input.filename && input.type === "document") {
    mediaPayload.filename = input.filename;
  }

  const { ok, json } = await graphRequest(
    creds,
    `/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: input.type,
        [input.type]: mediaPayload,
      }),
    },
  );

  if (!ok) return { ok: false, error: extractError(json), raw: json };
  return {
    ok: true,
    providerMessageId: extractMessageId(json),
    raw: json,
  };
}

export async function markMessageAsRead(
  credentials: WhatsAppCloudCredentials,
  providerMessageId: string,
): Promise<WhatsAppCloudSendResult> {
  const creds = requireCredentials(credentials);
  if (!providerMessageId) {
    return { ok: false, error: "providerMessageId is required." };
  }

  const { ok, json } = await graphRequest(
    creds,
    `/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: providerMessageId,
      }),
    },
  );

  if (!ok) return { ok: false, error: extractError(json), raw: json };
  return { ok: true, providerMessageId, raw: json };
}

export async function fetchMessageTemplates(
  credentials: WhatsAppCloudCredentials,
): Promise<{
  ok: boolean;
  templates: Array<Record<string, unknown>>;
  error?: string;
  raw?: Record<string, unknown>;
}> {
  const creds = requireCredentials(credentials);
  if (!creds.wabaId) {
    return {
      ok: false,
      templates: [],
      error: "wabaId is required to sync message templates.",
    };
  }

  const { ok, json } = await graphRequest(
    creds,
    `/${creds.wabaId}/message_templates?limit=100`,
  );

  if (!ok) {
    return { ok: false, templates: [], error: extractError(json), raw: json };
  }

  const data = Array.isArray(json.data)
    ? (json.data as Array<Record<string, unknown>>)
    : [];
  return { ok: true, templates: data, raw: json };
}

export async function resolveMediaUrl(
  credentials: WhatsAppCloudCredentials,
  providerMediaId: string,
): Promise<{
  ok: boolean;
  url?: string;
  mimeType?: string;
  fileSize?: number;
  sha256?: string;
  error?: string;
  raw?: Record<string, unknown>;
}> {
  const creds = requireCredentials(credentials);
  if (!providerMediaId) {
    return { ok: false, error: "providerMediaId is required." };
  }

  const { ok, json } = await graphRequest(creds, `/${providerMediaId}`);
  if (!ok) return { ok: false, error: extractError(json), raw: json };

  return {
    ok: true,
    url: typeof json.url === "string" ? json.url : undefined,
    mimeType: typeof json.mime_type === "string" ? json.mime_type : undefined,
    fileSize: typeof json.file_size === "number" ? json.file_size : undefined,
    sha256: typeof json.sha256 === "string" ? json.sha256 : undefined,
    raw: json,
  };
}

export async function downloadMediaBinary(
  credentials: WhatsAppCloudCredentials,
  mediaUrl: string,
): Promise<{ ok: boolean; bytes?: ArrayBuffer; error?: string }> {
  const creds = requireCredentials(credentials);
  try {
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `Failed to download media (${response.status}).`,
      };
    }
    const bytes = await response.arrayBuffer();
    return { ok: true, bytes };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to download media.",
    };
  }
}
