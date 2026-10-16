import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as oidc from 'openid-client';
import { db } from '@/lib/db';
import { beginSession } from '@/lib/auth';
import { digest, token } from '@/lib/security.mjs';
import { appleClient, flowCookie, setupCookie, cookieOptions } from '@/lib/apple-auth';
import { appleAuthConfig, appleSubject, appleProfile } from '@/lib/apple-auth-policy.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const config = appleAuthConfig();
  const destination = (path: string) => {
    const response = NextResponse.redirect(new URL(path, config?.origin || 'https://unsaidbox.com'), 303);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  };
  try {
    if (!config) return destination('/login?apple=failed');
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/x-www-form-urlencoded')
      return destination('/login?apple=failed');
    // Bound the body even when Content-Length is missing or dishonest.
    const reader = request.body?.getReader();
    if (!reader) return destination('/login?apple=failed');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); return destination('/login?apple=failed'); }
      chunks.push(value);
    }
    const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
    if (['state', 'code', 'error'].some(key => form.getAll(key).length > 1)) return destination('/login?apple=failed');
    const state = form.get('state');
    const jar = await cookies();
    const binding = jar.get(flowCookie)?.value;
    if (!state || !binding || !/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(binding)) return destination('/login?apple=expired');
    const flow = await db().oAuthAttempt.findUnique({ where: { tokenHash: digest(state) } });
    if (!flow || flow.kind !== 'APPLE_FLOW' || flow.browserHash !== digest(binding) || flow.expiresAt <= new Date()) return destination('/login?apple=expired');
    const consumed = await db().oAuthAttempt.deleteMany({ where: { tokenHash: flow.tokenHash, kind: 'APPLE_FLOW', browserHash: digest(binding), expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) return destination('/login?apple=expired');
    jar.delete(flowCookie);
    if (form.get('error')) return destination('/login?apple=cancelled');
    const payload = flow.payload as { nonce: string; clientId: string };
    if (payload.clientId !== config.clientId || !payload.nonce) return destination('/login?apple=failed');
    const { client } = await appleClient();
    // Ignore unsigned user/name fields. Only the code is exchanged for a verified ID token.
    const callback = new Request(config.redirectUri, { method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ state, code: form.get('code') || '' }) });
    const tokens = await oidc.authorizationCodeGrant(client, callback, { expectedState: state, expectedNonce: payload.nonce, idTokenExpected: true });
    const subject = appleSubject(tokens.claims());
    const identity = await db().socialIdentity.findUnique({ where: { provider_subject: { provider: 'apple', subject } }, include: { account: { select: { id: true, status: true } } } });
    if (identity) {
      if (identity.account.status !== 'ACTIVE') return destination('/login?apple=failed');
      await beginSession(identity.account.id);
      return destination('/dashboard');
    }
    const profile = appleProfile(tokens.claims());
    const ticket = token();
    await db().oAuthAttempt.create({ data: { tokenHash: digest(ticket), browserHash: digest(ticket), kind: 'APPLE_SETUP', payload: profile, expiresAt: new Date(Date.now() + 600_000) } });
    jar.set(setupCookie, ticket, cookieOptions(true));
    return destination('/auth/apple/complete');
  } catch { return destination('/login?apple=failed'); }
}
