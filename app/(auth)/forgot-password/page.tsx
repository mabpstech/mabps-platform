import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Forgot password</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
