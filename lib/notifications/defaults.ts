import { generateKeyPairSync, randomBytes } from "node:crypto";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from "@/lib/notifications/types";

export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannel[] = ["in_app"];
export const DEFAULT_NOTIFICATION_PRIORITY: NotificationPriority = "normal";
export const DEFAULT_NOTIFICATION_CATEGORY: NotificationCategory = "system";
export const DEFAULT_TIMEZONE = "UTC";

export function generateVapidKeys(): {
  publicKey: string;
  privateKey: string;
} {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });
  return {
    publicKey: Buffer.from(publicKey).toString("base64url"),
    privateKey: Buffer.from(privateKey).toString("base64url"),
  };
}

export function generateSubscriptionId(): string {
  return randomBytes(16).toString("hex");
}

export {
  maskSecret,
  truncateSummary,
  slugify,
  normalizeEmail,
  isValidEmail,
} from "@/lib/platform/secrets";

export function renderTemplateString(
  template: string,
  variables: Record<string, string> = {},
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (_, key: string) => variables[key] ?? "",
  );
}

export function channelPreferenceKey(
  channel: NotificationChannel,
):
  | "inAppEnabled"
  | "pushEnabled"
  | "emailEnabled"
  | "whatsappEnabled"
  | "browserEnabled" {
  switch (channel) {
    case "in_app":
      return "inAppEnabled";
    case "push":
      return "pushEnabled";
    case "email":
      return "emailEnabled";
    case "whatsapp":
      return "whatsappEnabled";
    case "browser":
      return "browserEnabled";
  }
}
