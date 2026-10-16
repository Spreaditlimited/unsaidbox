import { ActionForm } from './ActionForm';
import { startGoogle } from '@/app/auth/google/actions';
import { startApple } from '@/app/auth/apple/actions';
import { googleAuthConfig } from '@/lib/google-auth-policy.mjs';
import { appleAuthConfig } from '@/lib/apple-auth-policy.mjs';
import styles from './GoogleSignIn.module.css';

export function SocialSignIn() {
  const google = Boolean(googleAuthConfig());
  const apple = Boolean(appleAuthConfig());
  if (!google && !apple) return null;
  return <div className={styles.social}>
    {google ? <ActionForm action={startGoogle} label="Continue with Google" captchaAction="googleSignIn"><span className={styles.empty} /></ActionForm> : null}
    {apple ? <div className={styles.apple}><ActionForm action={startApple} label="Continue with Apple" captchaAction="appleSignIn"><span className={styles.empty} /></ActionForm></div> : null}
    <div className={styles.divider}><span>or continue with email</span></div>
  </div>;
}
