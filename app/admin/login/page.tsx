import { redirect } from "next/navigation";
import { currentAdministrator } from "@/lib/admin-auth";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/AuthField";
import { ActionForm } from "@/components/ActionForm";
import { adminLogin } from "../actions";

export const metadata = { title: "Administrator sign in", robots: { index: false, follow: false } };
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ passwordChanged?: string }> }) {
  if (await currentAdministrator()) redirect("/admin");
  const params = await searchParams;
  return <AuthShell admin>
    <header className="auth-form-header">
      <p className="auth-eyebrow">UNSAIDBOX ADMINISTRATION</p>
      <h1>Administrator sign in</h1>
      <p>Restricted access for the team managing UnsaidBox. This is separate from your personal box.</p>
    </header>
    {params.passwordChanged === "1" && <p className="notice" role="status">Password changed. Sign in with your new administrator password.</p>}
    <ActionForm action={adminLogin} label="Sign in to administration" captchaAction="adminLogin">
      <AuthField label="Administrator email" icon="email" type="email" name="email" required maxLength={254} autoComplete="username" />
      <AuthField label="Administrator password" icon="password" type="password" name="password" required maxLength={128} autoComplete="current-password" />
    </ActionForm>
    <p className="fine">Administrator access is provisioned privately. Contact the server operator if you need access or password recovery.</p>
  </AuthShell>;
}
