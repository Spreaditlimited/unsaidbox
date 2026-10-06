import { Checkbox } from "@/components/ui/Checkbox";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/AuthField";
import { ActionForm } from "@/components/ActionForm";
import { register } from "@/app/actions";
export const metadata = { title: "Create your box" };
export default function Start() {
  return (
    <AuthShell signup>
      <header className="auth-form-header">
        <p className="auth-eyebrow">YOUR OWN SPACE FOR HONESTY</p>
        <h1>Create your box</h1>
        <p>One account. A private inbox. Your own link to share.</p>
      </header>
      <ActionForm
        action={register}
        label="Create account"
        captchaAction="register"
      >
        <div className="auth-field-grid">
          <AuthField
            label="Your name"
            icon="name"
            name="displayName"
            required
            maxLength={80}
            autoComplete="name"
            placeholder="Your name"
          />
          <AuthField
            label="Username"
            icon="username"
            name="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9][a-zA-Z0-9_]*"
            autoComplete="username"
            placeholder="yourname"
          />
        </div>
        <AuthField
          label="Email"
          icon="email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <AuthField
          label="Password"
          icon="password"
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          placeholder="Create a secure password"
          hint="Use at least 12 characters."
        />
        <Checkbox name="adult" required>
          <span>
            I am 18 or older and have read the{" "}
            <Link href="/safety">privacy and safety information</Link>.
          </span>
        </Checkbox>
      </ActionForm>
      <p className="auth-switch">
        Already have a box? <Link href="/login">Sign in</Link>
      </p>
      <div className="auth-testing-note">
        <p>
          Confirm your email before collecting messages. Account
          emails come from hello@unsaidbox.com.
        </p>
      </div>
    </AuthShell>
  );
}
