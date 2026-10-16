import { ActionForm } from './ActionForm';
import { startGoogle } from '@/app/auth/google/actions';
import { googleAuthConfig } from '@/lib/google-auth-policy.mjs';
import styles from './GoogleSignIn.module.css';

export function GoogleSignIn() {
  if (!googleAuthConfig()) return null;
  return <div className={styles.social}>
    <ActionForm action={startGoogle} label="Continue with Google" captchaAction="googleSignIn"><span className={styles.empty} /></ActionForm>
    <div className={styles.divider}><span>or continue with email</span></div>
  </div>;
}
