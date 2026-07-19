import { randomBytes } from "node:crypto";
import { WHATSAPP_API_VERSION_DEFAULT } from "@/lib/whatsapp/types";

export const DEFAULT_WHATSAPP_API_VERSION = WHATSAPP_API_VERSION_DEFAULT;

export function generateVerifyToken(): string {
  return `wa_verify_${randomBytes(16).toString("hex")}`;
}

export function generateWebhookPathSecret(): string {
  return randomBytes(24).toString("hex");
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  return digits.replace(/\D/g, "");
}

export function displayPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return normalized ? `+${normalized}` : phone;
}

export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function graphBaseUrl(apiVersion = DEFAULT_WHATSAPP_API_VERSION): string {
  return `https://graph.facebook.com/${apiVersion}`;
}

export function truncateSummary(text: string, max = 240): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
