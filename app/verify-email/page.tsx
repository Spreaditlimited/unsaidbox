import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { verifyEmail } from "@/app/email-actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};
export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const valid = /^[a-f0-9]{64}$/.test(token);
  return (
    <AuthShell>
      <header className="auth-form-header">
        <h1>Your box is almost ready</h1>
        <p>Confirm your email to activate your account.</p>
      </header>
      {valid ? (
        <ActionForm
          action={verifyEmail}
          label="Confirm my email"
          captchaAction="verifyEmail"
        >
          <input type="hidden" name="token" value={token} />
          <p>
            Press the button to confirm. Opening this page alone does not
            activate your account.
          </p>
        </ActionForm>
      ) : (
        <p role="alert">
          This verification link is invalid. Sign in to request a new one.
        </p>
      )}
      <p className="auth-switch">
        <Link href="/login">Sign in</Link> ·{" "}
        <Link href="/dashboard">Open dashboard</Link>
      </p>
    </AuthShell>
  );
}
