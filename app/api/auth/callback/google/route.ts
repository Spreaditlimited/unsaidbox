import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as oidc from 'openid-client';
import { db } from '@/lib/db';
import { beginSession } from '@/lib/auth';
import { digest, token } from '@/lib/security.mjs';
import { googleClient, flowCookie, setupCookie, cookieOptions } from '@/lib/google-auth';
import { googleAuthConfig, googleProfile } from '@/lib/google-auth-policy.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const config = googleAuthConfig();
  const origin = config?.origin || 'https://unsaidbox.com';
  const destination = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin), 303);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  };
  try {
    if (!config) return destination('/login?google=failed');
    const state = request.nextUrl.searchParams.get('state');
    const jar = await cookies();
    const binding = jar.get(flowCookie)?.value;
    if (!state || !binding || !/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(binding)) return destination('/login?google=expired');
    const flow = await db().oAuthAttempt.findUnique({ where: { tokenHash: digest(state) } });
    if (!flow || flow.kind !== 'GOOGLE_FLOW' || flow.browserHash !== digest(binding) || flow.expiresAt <= new Date()) return destination('/login?google=expired');
    const consumed = await db().oAuthAttempt.deleteMany({ where: { tokenHash: flow.tokenHash, browserHash: digest(binding), expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) return destination('/login?google=expired');
    jar.delete(flowCookie);
    if (request.nextUrl.searchParams.get('error')) return destination('/login?google=cancelled');
    const payload = flow.payload as { nonce: string; verifier: string; clientId: string };
    if (payload.clientId !== config.clientId) return destination('/login?google=failed');
    const { client } = await googleClient();
    const callback = new URL(config.redirectUri);
    callback.search = request.nextUrl.search;
    const tokens = await oidc.authorizationCodeGrant(client, callback, { expectedState: state, expectedNonce: payload.nonce, pkceCodeVerifier: payload.verifier, idTokenExpected: true });
    const profile = googleProfile(tokens.claims());
    // Stable provider subject is the identity. Never silently merge accounts by email.
    const identity = await db().socialIdentity.findUnique({ where: { provider_subject: { provider: 'google', subject: profile.subject } }, include: { account: { select: { id: true, status: true } } } });
    if (identity) {
      if (identity.account.status !== 'ACTIVE') return destination('/login?google=failed');
      await beginSession(identity.account.id);
      return destination('/dashboard');
    }
    const ticket = token();
    await db().oAuthAttempt.create({ data: { tokenHash: digest(ticket), browserHash: digest(ticket), kind: 'GOOGLE_SETUP', payload: profile, expiresAt: new Date(Date.now() + 600_000) } });
    jar.set(setupCookie, ticket, cookieOptions(config.secure));
    return destination('/auth/google/complete');
  } catch { return destination('/login?google=failed'); }
}
