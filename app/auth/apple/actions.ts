'use server';
import { headers, cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import * as oidc from 'openid-client';
import { db } from '@/lib/db';
import { beginSession, rateLimit } from '@/lib/auth';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { digest, token, InputError, verifyPassword, usernameValue, textValue } from '@/lib/security.mjs';
import { appleClient, appleSetup, flowCookie, setupCookie, flowCookieOptions } from '@/lib/apple-auth';
import { appleAuthConfig } from '@/lib/apple-auth-policy.mjs';
import type { Result } from '@/app/actions';

function errorResult(error: unknown): Result {
  unstable_rethrow(error);
  return { error: error instanceof InputError ? error.message : 'Apple sign-in is temporarily unavailable. Please use email sign-in or try again later.' };
}

export async function startApple(_: Result, form: FormData): Promise<Result> {
  try {
    const config = appleAuthConfig();
    if (!config) throw new InputError('Apple sign-in is not configured for this environment.');
    if ((await headers()).get('origin') !== config.origin)
      throw new InputError(`Open ${config.origin}/login to use Apple sign-in.`);
    await verifyCaptcha(form, 'appleSignIn');
    await rateLimit('apple-start-global', 200, 900);
    const { client, settings } = await appleClient();
    const state = token(), binding = token(), nonce = token();
    await db().oAuthAttempt.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db().oAuthAttempt.create({ data: { tokenHash: digest(state), browserHash: digest(binding), kind: 'APPLE_FLOW',
      expiresAt: new Date(Date.now() + 600_000), payload: { nonce, clientId: settings.clientId } } });
    const jar = await cookies();
    jar.set(flowCookie, binding, flowCookieOptions());
    jar.delete(setupCookie);
    const url = oidc.buildAuthorizationUrl(client, { redirect_uri: settings.redirectUri, scope: 'email',
      response_type: 'code', state, nonce, response_mode: 'form_post' });
    redirect(url.href);
  } catch (error) { return errorResult(error); }
}

export async function finishApple(_: Result, form: FormData): Promise<Result> {
  try {
    await verifyCaptcha(form, 'appleComplete');
    const setup = await appleSetup();
    if (!setup) throw new InputError('This sign-in session has expired. Please start Apple sign-in again.');
    const { profile, row } = setup;
    await rateLimit(`apple-complete:${profile.subject}`, 8, 900);
    const existing = await db().account.findUnique({ where: { email: profile.email } });
    if (existing) {
      if (existing.status === 'SUSPENDED' || !await verifyPassword(form.get('password'), existing.passwordHash))
        throw new InputError('Unable to link this account. Check your password or use password recovery.');
      if (form.get('linkConsent') !== 'on') throw new InputError('Confirm that you want to link your Apple account.');
    } else if (form.get('adult') !== 'on') throw new InputError('You must be 18 or older and agree to the terms to create an account.');
    const username = existing ? null : usernameValue(form.get('username'));
    const displayName = existing ? null : textValue(form.get('displayName'), 'Display name', 80);
    const accountId = await db().$transaction(async tx => {
      const claimed = await tx.oAuthAttempt.deleteMany({ where: { tokenHash: row.tokenHash, kind: 'APPLE_SETUP', expiresAt: { gt: new Date() } } });
      if (claimed.count !== 1) throw new InputError('This sign-in has already been completed or has expired.');
      let id: string;
      if (existing) {
        const confirmed = await tx.account.updateMany({ where: { id: existing.id, email: profile.email, passwordHash: existing.passwordHash, status: { not: 'SUSPENDED' } }, data: { emailVerifiedAt: new Date(), status: 'ACTIVE' } });
        if (confirmed.count !== 1) throw new InputError('Your account changed. Please start sign-in again.');
        id = existing.id;
      } else {
        const account = await tx.account.create({ data: { email: profile.email, emailVerifiedAt: new Date(), username: username!, displayName: displayName!, status: 'ACTIVE', passwordHash: `apple-only:${token()}` }, select: { id: true } });
        id = account.id;
      }
      await tx.socialIdentity.create({ data: { provider: 'apple', subject: profile.subject, accountId: id } });
      return id;
    });
    (await cookies()).delete(setupCookie);
    await beginSession(accountId);
    redirect('/dashboard');
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')
      return { error: 'That username or sign-in is already in use. Choose another username, or restart sign-in if you already completed this step.' };
    return errorResult(error);
  }
}
