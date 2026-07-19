import { createHmac, randomBytes, createHash } from "node:crypto";
import type { EmailProvider } from "@/lib/email-engine/types";

export const DEFAULT_EMAIL_PROVIDER: EmailProvider = "resend";
export const DEFAULT_SES_REGION = "us-east-1";
export const DEFAULT_SMTP_PORT = 587;

export function generateWebhookPathSecret(): string {
  return randomBytes(24).toString("hex");
}

export function generateTrackingSecret(): string {
  return randomBytes(32).toString("hex");
}

export function generateTrackingToken(): string {
  return randomBytes(24).toString("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
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

export function formatFromAddress(
  fromEmail: string,
  fromName?: string | null,
): string {
  if (!fromName?.trim()) return fromEmail;
  const escaped = fromName.replace(/"/g, '\\"');
  return `"${escaped}" <${fromEmail}>`;
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export function signTrackingPayload(
  secret: string,
  payload: string,
): string {
  return createHmac("sha256", secret).update(payload).digest("hex").slice(0, 24);
}

export function renderTemplateString(
  template: string,
  variables: Record<string, string> = {},
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    return variables[key] ?? "";
  });
}
