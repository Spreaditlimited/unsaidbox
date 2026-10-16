import 'server-only';
import { appleClientSecret } from './apple-client-secret.mjs';
import * as oidc from 'openid-client';
import { cookies } from 'next/headers';
import { db } from './db';
import { appleAuthConfig } from './apple-auth-policy.mjs';
import { digest, InputError } from './security.mjs';

export const flowCookie = 'unsaidbox_apple_flow';
export const setupCookie = 'unsaidbox_apple_setup';
export const cookieOptions = (secure: boolean) => ({ httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge: 600 });

export async function appleClient() {
  const settings = appleAuthConfig();
  if (!settings) throw new InputError('Apple sign-in is not configured for this environment.');
  const client = await oidc.discovery(new URL('https://appleid.apple.com'), settings.clientId,
    appleClientSecret(settings), undefined, { timeout: 10, execute: [oidc.enableNonRepudiationChecks] });
  return { client, settings };
}

export async function appleSetup() {
  const value = (await cookies()).get(setupCookie)?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const row = await db().oAuthAttempt.findUnique({ where: { tokenHash: digest(value) } });
  if (!row || row.kind !== 'APPLE_SETUP' || row.expiresAt <= new Date()) return null;
  const data = row.payload as { subject?: string; email?: string; name?: string };
  if (!data.subject || !data.email) return null;
  return { row, profile: { subject: data.subject, email: data.email, name: data.name || '' } };
}

// Apple's cross-site form POST must carry the short-lived browser-binding cookie.
export const flowCookieOptions = () => ({ ...cookieOptions(true), sameSite: 'none' as const });
