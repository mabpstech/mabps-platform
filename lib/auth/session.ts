import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth/server";

export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession(
  options: { callbackUrl?: string } = {},
): Promise<Session> {
  const session = await getSession();
  if (!session) {
    const callback = options.callbackUrl
      ? `?callbackUrl=${encodeURIComponent(options.callbackUrl)}`
      : "";
    redirect(`/login${callback}`);
  }
  return session;
}
