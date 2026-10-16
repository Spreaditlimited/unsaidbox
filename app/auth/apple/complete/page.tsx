import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { AuthField } from '@/components/AuthField';
import { ActionForm } from '@/components/ActionForm';
import { Checkbox } from '@/components/ui/Checkbox';
import { appleSetup } from '@/lib/apple-auth';
import { db } from '@/lib/db';
import { finishApple } from '../actions';

export const metadata = { title: 'Complete Apple sign-in', robots: { index: false, follow: false } };
export default async function CompleteApple() {
  const setup = await appleSetup();
  if (!setup) redirect('/login?apple=expired');
  const existing = await db().account.findUnique({ where: { email: setup.profile.email }, select: { id: true } });
  return <AuthShell signup={!existing}>
    <header className="auth-form-header"><h1>{existing ? 'Connect your Apple account' : 'Make this box yours'}</h1><p>{existing ? 'An UnsaidBox account already uses this email. Confirm its password to link Apple safely.' : 'Apple has verified your email. Choose how your box will appear.'}</p></header>
    <p className="fine">Apple account: {setup.profile.email}</p>
    <ActionForm action={finishApple} label={existing ? 'Link Apple and sign in' : 'Create my box'} captchaAction="appleComplete">
      {existing ? <>
        <AuthField name="password" label="Your UnsaidBox password" type="password" icon="password" autoComplete="current-password" required maxLength={128} />
        <Checkbox name="linkConsent" required>Allow this Apple account to sign in to my existing UnsaidBox account.</Checkbox>
      </> : <>
        <AuthField name="displayName" label="Your name" icon="name" defaultValue={setup.profile.name} maxLength={80} required autoComplete="name" />
        <AuthField name="username" label="Username" icon="username" minLength={3} maxLength={30} required pattern="[a-zA-Z0-9][a-zA-Z0-9_]*" autoComplete="username" />
        <Checkbox name="adult" required>I am 18 or older, agree to the <Link href="/terms">terms of service</Link> and have read the <Link href="/safety">privacy and safety information</Link>.</Checkbox>
      </>}
    </ActionForm>
    {existing ? <p className="auth-switch"><Link href="/forgot-password">Forgot your password?</Link></p> : <p className="fine">You’ll sign in with Apple. To add a password later, use the password recovery option with this email address.</p>}
    <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
  </AuthShell>;
}
