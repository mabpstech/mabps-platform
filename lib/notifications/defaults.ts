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

export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function truncateSummary(text: string, max = 240): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function renderTemplateString(
  template: string,
  variables: Record<string, string> = {},
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (_, key: string) => variables[key] ?? "",
  );
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
