import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Reset password</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Choose a new password for your account.
        </p>
      </div>
      <ResetPasswordForm token={params.token ?? ""} />
    </div>
  );
}
