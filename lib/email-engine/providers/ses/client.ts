import { createHash, createHmac } from "node:crypto";
import { formatFromAddress } from "@/lib/email-engine/defaults";
import type { EmailProviderSendResult } from "@/lib/email-engine/types";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

/**
 * Amazon SES v2 SendEmail via signed HTTP (no AWS SDK dependency).
 */
export async function sendWithSes(input: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  fromEmail: string;
  fromName?: string | null;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | null;
}): Promise<EmailProviderSendResult> {
  const region = input.region || "us-east-1";
  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;
  const service = "ses";

  const content: Record<string, unknown> = {
    Simple: {
      Subject: { Data: input.subject, Charset: "UTF-8" },
      Body: {},
    },
  };
  const body = content.Simple as {
    Subject: { Data: string; Charset: string };
    Body: Record<string, unknown>;
  };
  if (input.html) {
    body.Body.Html = { Data: input.html, Charset: "UTF-8" };
  }
  if (input.text) {
    body.Body.Text = { Data: input.text, Charset: "UTF-8" };
  }
  if (!input.html && !input.text) {
    body.Body.Text = { Data: input.subject, Charset: "UTF-8" };
  }

  const payload: Record<string, unknown> = {
    FromEmailAddress: formatFromAddress(input.fromEmail, input.fromName),
    Destination: { ToAddresses: [input.to] },
    Content: content,
  };
  if (input.replyTo) {
    payload.ReplyToAddresses = [input.replyTo];
  }

  const bodyString = JSON.stringify(payload);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(bodyString);

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = [
    "POST",
    "/v2/email/outbound-emails",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(
    input.secretAccessKey,
    dateStamp,
    region,
    service,
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Amz-Date": amzDate,
        Authorization: authorization,
      },
      body: bodyString,
    });

    const raw = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      const message =
        typeof raw.message === "string"
          ? raw.message
          : typeof (raw as { Message?: string }).Message === "string"
            ? (raw as { Message: string }).Message
            : `SES send failed (${response.status}).`;
      return { ok: false, error: message, raw };
    }

    return {
      ok: true,
      providerMessageId:
        typeof raw.MessageId === "string" ? raw.MessageId : undefined,
      raw,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "SES send failed.",
    };
  }
}
