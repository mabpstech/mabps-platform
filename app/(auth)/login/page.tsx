import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthEnabled } from "@/lib/auth/server";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/dashboard";
  const googleEnabled = isGoogleAuthEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {googleEnabled
            ? "Access your MABPS workspaces with email or Google."
            : "Access your MABPS workspaces with email."}
        </p>
      </div>
      <LoginForm callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
    </div>
  );
}
