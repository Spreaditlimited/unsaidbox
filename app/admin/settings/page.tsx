import { requireAdministrator } from "@/lib/admin-auth";
import { AdminShell } from "@/components/AdminShell";
import { ActionForm } from "@/components/ActionForm";
import { AuthField } from "@/components/AuthField";
import { saveAdminSettings } from "../actions";
export default async function AdminSettings() {
  const administrator = await requireAdministrator();
  return <AdminShell name={administrator.displayName}>
    <h1>Administrator settings</h1>
    <p className="notice">These credentials and settings are separate from any personal UnsaidBox account.</p>
    <section className="panel dashboard-section">
      <ActionForm action={saveAdminSettings} label="Save administrator settings" captchaAction="saveAdminSettings">
        <label>Email<input value={administrator.email} readOnly type="email" /></label>
        <label>Display name<input name="displayName" defaultValue={administrator.displayName} required maxLength={80} /></label>
        <AuthField label="Current administrator password" icon="password" type="password" name="currentPassword" required autoComplete="current-password" maxLength={128} />
        <AuthField label="New administrator password (optional)" icon="password" type="password" name="newPassword" minLength={12} maxLength={128} autoComplete="new-password" />
        <p className="fine">Changing your password signs out all administrator sessions. Your personal account is unaffected.</p>
      </ActionForm>
    </section>
  </AdminShell>;
}
