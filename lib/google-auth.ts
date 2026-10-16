import 'server-only';
import * as oidc from 'openid-client';
import { cookies } from 'next/headers';
import { db } from './db';
import { googleAuthConfig } from './google-auth-policy.mjs';
import { digest, InputError } from './security.mjs';

export const flowCookie = 'unsaidbox_google_flow';
export const setupCookie = 'unsaidbox_google_setup';
export const cookieOptions = (secure: boolean) => ({ httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge: 600 });

export async function googleClient() {
  const settings = googleAuthConfig();
  if (!settings) throw new InputError('Google sign-in is not configured for this environment.');
  const client = await oidc.discovery(new URL('https://accounts.google.com'), settings.clientId,
    settings.clientSecret, undefined, { timeout: 10, execute: [oidc.enableNonRepudiationChecks] });
  return { client, settings };
}

export async function googleSetup() {
  const value = (await cookies()).get(setupCookie)?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const row = await db().oAuthAttempt.findUnique({ where: { tokenHash: digest(value) } });
  if (!row || row.kind !== 'GOOGLE_SETUP' || row.expiresAt <= new Date()) return null;
  const data = row.payload as { subject?: string; email?: string; name?: string };
  if (!data.subject || !data.email) return null;
  return { row, profile: { subject: data.subject, email: data.email, name: data.name || '' } };
}
