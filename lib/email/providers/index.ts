import { ConsoleEmailProvider } from "@/lib/email/providers/console";
import { ResendEmailProvider } from "@/lib/email/providers/resend";
import type { EmailProvider } from "@/lib/email/providers/types";

export type { EmailProvider, EmailProviderSendInput } from "@/lib/email/providers/types";
export { ConsoleEmailProvider } from "@/lib/email/providers/console";
export { ResendEmailProvider } from "@/lib/email/providers/resend";

/**
 * Prefer Resend when configured; otherwise use console logging (dev-safe).
 */
export function resolveEmailProvider(
  preferred?: EmailProvider,
): EmailProvider {
  if (preferred) return preferred;

  const resend = new ResendEmailProvider();
  if (resend.isConfigured()) return resend;

  return new ConsoleEmailProvider();
}
