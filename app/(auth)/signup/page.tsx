import { SignupForm } from "@/components/auth/signup-form";
import { isGoogleAuthEnabled } from "@/lib/auth/server";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Create account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Start with email/password or continue with Google.
        </p>
      </div>
      <SignupForm googleEnabled={isGoogleAuthEnabled} />
    </div>
  );
}
