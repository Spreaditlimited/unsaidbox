import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/AuthField";
import { ActionForm } from "@/components/ActionForm";
import { login } from "@/app/actions";
import { SocialSignIn } from '@/components/SocialSignIn';
import { appleLoginError } from '@/lib/apple-auth-policy.mjs';
import { googleLoginError } from '@/lib/google-auth-policy.mjs';
export const metadata = { title: "Sign in" };
export default async function Login({ searchParams }: { searchParams: Promise<{ google?: string; apple?: string }> }) {
  const params = await searchParams;
  const message = googleLoginError(params.google) || appleLoginError(params.apple);
  return (
    <AuthShell>
      <header className="auth-form-header">
        <h1>Welcome back</h1>
        <p>Please enter your details to sign in.</p>
      </header>
      {message ? <p className="form-error" role="alert">{message}</p> : null}
      <SocialSignIn />
      <ActionForm action={login} label="Sign in" captchaAction="login">
        <AuthField
          label="Email"
          icon="email"
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="Enter your email"
        />
        <AuthField
          label="Password"
          icon="password"
          type="password"
          name="password"
          required
          maxLength={128}
          autoComplete="current-password"
          placeholder="Enter your password"
        />
      </ActionForm>
      <p className="auth-switch">
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>
      <p className="auth-switch">
        Don’t have an account? <Link href="/start">Create your box</Link>
      </p>
    </AuthShell>
  );
}
