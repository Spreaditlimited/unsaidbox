import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/AuthField";
import { ActionForm } from "@/components/ActionForm";
import { requestPasswordReset } from "@/app/email-actions";
export const metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};
export default function ForgotPassword() {
  return (
    <AuthShell>
      <header className="auth-form-header">
        <h1>Forgot your password?</h1>
        <p>
          It happens. Enter your email and we’ll help you get back into your
          box.
        </p>
      </header>
      <ActionForm
        action={requestPasswordReset}
        label="Send reset link"
        captchaAction="requestPasswordReset"
      >
        <AuthField
          label="Email"
          icon="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@example.com"
        />
      </ActionForm>
      <p className="auth-switch">
        <Link href="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
