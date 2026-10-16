import { InputError } from './security.mjs';

export function appleAuthConfig(env = process.env) {
  if (env.VERCEL && env.VERCEL_ENV !== 'production') return null;
  const local = !env.VERCEL && env.NODE_ENV !== 'production';
  const prefix = local ? 'UNSAIDBOX_APPLE_AUTH_TEST_' : 'UNSAIDBOX_APPLE_AUTH_';
  const clientId = env[`${prefix}CLIENT_ID`]?.trim();
  const teamId = env[`${prefix}TEAM_ID`]?.trim();
  const keyId = env[`${prefix}KEY_ID`]?.trim();
  const privateKey = env[`${prefix}PRIVATE_KEY`]?.replace(/\\n/g, '\n').trim();
  if (!clientId || !teamId || !keyId || !privateKey) return null;
  let origin;
  try {
    const url = new URL(local ? env.UNSAIDBOX_APPLE_AUTH_TEST_ORIGIN : 'https://unsaidbox.com');
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        !url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname) || url.hostname.endsWith('.localhost')) return null;
    origin = url.origin;
  } catch { return null; }
  return { clientId, teamId, keyId, privateKey, origin, redirectUri: `${origin}/api/auth/callback/apple`, secure: true };
}

// Call only after OIDC signature, issuer, audience, expiry and nonce verification.
export function appleSubject(claims) {
  if (!claims || typeof claims.sub !== 'string' || !/^[A-Za-z0-9._-]{1,255}$/.test(claims.sub))
    throw new InputError('Apple did not provide a valid identity. Please start again.');
  return claims.sub;
}
export function appleProfile(claims) {
  const subject = appleSubject(claims);
  if (![true, 'true'].includes(claims.email_verified) || typeof claims.email !== 'string' ||
      claims.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email))
    throw new InputError('Apple did not provide a verified email. Please use email sign-in.');
  // Private relay addresses are valid. Do not trust Apple's unsigned user/name form field.
  return { subject, email: claims.email.toLowerCase(), name: '' };
}
export function appleLoginError(code) {
  return { cancelled: 'Apple sign-in was cancelled. You can try again or sign in with email.',
    failed: 'Apple sign-in could not be completed. Please start again. Your existing account has not been changed.',
    expired: 'Your Apple sign-in session expired. Please start again.' }[code] || '';
}
