import { Checkbox } from "@/components/ui/Checkbox";
import { requireAccount } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { ActionForm } from "@/components/ActionForm";
import { AuthField } from "@/components/AuthField";
import { saveSettings, changePassword } from "@/app/actions";
import { CopyLink } from "@/components/CopyLink";
import { ProfilePhotoEditor } from "@/components/ProfilePhotoEditor";
import { avatarState } from "@/lib/avatar";
import { emailSettings } from "@/lib/email";
import { resendVerification, saveEmailPreferences } from "@/app/email-actions";
export default async function Settings() {
  const a = await requireAccount();
  const avatar = await avatarState(a.id);
  const email = await emailSettings(a.id);
  return (
    <DashboardShell
      accountId={a.id}
      name={a.displayName}
    >
      <h1>Your box, your boundaries.</h1>
      <ProfilePhotoEditor
        name={a.displayName}
        version={avatar.version}
        ready={avatar.ready}
      />
      <section className="panel editor-panel">
        <ActionForm
          action={saveSettings}
          label="Save settings"
          captchaAction="saveSettings"
        >
          <label>
            Display name
            <input
              name="displayName"
              defaultValue={a.displayName}
              required
              maxLength={80}
            />
          </label>
          <label>
            Introduction
            <textarea
              name="introduction"
              defaultValue={a.introduction ?? ""}
              maxLength={500}
            />
          </label>
          <Checkbox name="inboxOpen" defaultChecked={a.inboxOpen}>
            Accept anonymous inbox messages
          </Checkbox>
          <Checkbox
            name="publicPageEnabled"
            defaultChecked={a.publicPageEnabled}
          >
            Enable my public page
          </Checkbox>
          <Checkbox
            name="privateOnly"
            defaultChecked={a.inboxSharingPolicy === "PRIVATE_ONLY"}
          >
            New inbox messages are private-only
          </Checkbox>
          <p className="fine">
            Private-only messages cannot be published or exported through
            UnsaidBox. Existing messages keep the promise shown when they were
            sent. Question links have their own fixed sharing policy.
          </p>
        </ActionForm>
        <CopyLink path={`/u/${a.username}`} label="Copy public page link" />
      </section>
      <section className="panel editor-panel">
        <h2>Change password</h2>
        <ActionForm
          action={changePassword}
          label="Update password"
          captchaAction="changePassword"
        >
          <AuthField
            label="Current password"
            icon="password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            maxLength={128}
          />
          <AuthField
            label="New password"
            icon="password"
            name="newPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
          />
          <p className="fine">
            Use 12–128 characters. Other signed-in sessions will be ended.
          </p>
        </ActionForm>
      </section>
      <section className="panel editor-panel">
        <h2>Email & notifications</h2>
        <p>
          {a.email} · {a.emailVerifiedAt ? "Verified" : "Not yet verified"}
        </p>
        {!email.ready ? (
          <p className="fine">
            Email setup is still being completed. Notifications are not enabled
            yet.
          </p>
        ) : (
          <>
            {!a.emailVerifiedAt ? (
              <ActionForm
                action={resendVerification}
                label="Verify my email"
                captchaAction="resendVerification"
              >
                <p className="fine">
                  Verify your address before enabling optional notifications.
                </p>
              </ActionForm>
            ) : null}
            <ActionForm
              action={saveEmailPreferences}
              label="Save email preferences"
              captchaAction="saveEmailPreferences"
            >
              <Checkbox
                name="newMessages"
                defaultChecked={email.newMessages}
                disabled={!a.emailVerifiedAt}
              >
                Email me about new messages and answers
              </Checkbox>
              <p className="fine">
                Optional notifications start switched off. Message content never
                appears in email. Inbox alerts are limited to one per hour;
                account-security emails cannot be switched off.
              </p>
            </ActionForm>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
