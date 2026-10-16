import { InputError } from './security.mjs';

export function googleAuthConfig(env = process.env) {
  // Never select live credentials based on a request host or client input.
  const local = !env.VERCEL && env.NODE_ENV !== 'production';
  if (env.VERCEL && env.VERCEL_ENV !== 'production') return null;
  const prefix = local ? 'UNSAIDBOX_GOOGLE_AUTH_TEST_' : 'UNSAIDBOX_GOOGLE_AUTH_';
  const clientId = env[`${prefix}CLIENT_ID`]?.trim();
  const clientSecret = env[`${prefix}CLIENT_SECRET`]?.trim();
  if (!clientId || !clientSecret || !clientId.endsWith('.apps.googleusercontent.com')) return null;
  const origin = local ? 'http://localhost:3001' : 'https://unsaidbox.com';
  return { clientId, clientSecret, origin, redirectUri: `${origin}/api/auth/callback/google`, secure: !local };
}

// Use only claims returned AFTER OIDC signature, issuer, audience, nonce and expiry verification.
export function googleProfile(claims) {
  if (!claims || typeof claims.sub !== 'string' || !/^[0-9]{1,255}$/.test(claims.sub) || claims.email_verified !== true ||
      typeof claims.email !== 'string' || claims.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email))
    throw new InputError('Google did not provide a verified email address. Please use email sign-in.');
  return { subject: claims.sub, email: claims.email.toLowerCase(), name: typeof claims.name === 'string' ? claims.name.slice(0, 80) : '' };
}

export function googleLoginError(code) {
  return {
    cancelled: 'Google sign-in was cancelled. You can try again or sign in with email.',
    failed: 'Google sign-in could not be completed. Please start again. Your existing account has not been changed.',
    expired: 'Your Google sign-in session expired. Please start again.',
  }[code] || '';
}
