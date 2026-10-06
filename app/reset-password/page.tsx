import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/AuthField";
import { ActionForm } from "@/components/ActionForm";
import { resetPassword } from "@/app/email-actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const valid = /^[a-f0-9]{64}$/.test(token);
  return (
    <AuthShell>
      <header className="auth-form-header">
        <h1>A fresh start</h1>
        <p>Choose a strong password you haven’t used elsewhere.</p>
      </header>
      {valid ? (
        <ActionForm
          action={resetPassword}
          label="Reset password"
          captchaAction="resetPassword"
        >
          <input type="hidden" name="token" value={token} />
          <AuthField
            label="New password"
            icon="password"
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            hint="Use 12–128 characters."
          />
          <AuthField
            label="Confirm password"
            icon="password"
            name="confirmation"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </ActionForm>
      ) : (
        <p role="alert">
          This reset link is invalid. Request a new link below.
        </p>
      )}
      <p className="auth-switch">
        <Link href="/login">Sign in</Link> ·{" "}
        <Link href="/forgot-password">Request a new link</Link>
      </p>
    </AuthShell>
  );
}
