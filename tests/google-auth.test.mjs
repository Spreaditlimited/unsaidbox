import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { googleAuthConfig, googleProfile, googleLoginError } from '../lib/google-auth-policy.mjs';
import * as security from '../lib/security.mjs';

const env = { NODE_ENV: 'development', UNSAIDBOX_GOOGLE_AUTH_TEST_CLIENT_ID: 'local.apps.googleusercontent.com', UNSAIDBOX_GOOGLE_AUTH_TEST_CLIENT_SECRET: 'local-secret', UNSAIDBOX_GOOGLE_AUTH_CLIENT_ID: 'live.apps.googleusercontent.com', UNSAIDBOX_GOOGLE_AUTH_CLIENT_SECRET: 'live-secret' };
test('Google credentials never fall back between development, preview and production', () => {
  assert.equal(googleAuthConfig(env).clientSecret, 'local-secret');
  assert.equal(googleAuthConfig(env).redirectUri, 'http://localhost:3001/api/auth/callback/google');
  assert.equal(googleAuthConfig({ ...env, NODE_ENV: 'production' }).clientSecret, 'live-secret');
  assert.equal(googleAuthConfig({ ...env, VERCEL: '1', VERCEL_ENV: 'preview' }), null);
  assert.equal(googleAuthConfig({ ...env, UNSAIDBOX_GOOGLE_AUTH_TEST_CLIENT_SECRET: '' }), null);
  assert.equal(googleAuthConfig({ ...env, VERCEL: '1', VERCEL_ENV: 'production' }).secure, true);
});
test('only verified, bounded Google profiles are accepted and arbitrary error text is not reflected', () => {
  assert.deepEqual(googleProfile({ sub: '123', email: 'USER@example.com', email_verified: true, name: 'Name' }), { subject: '123', email: 'user@example.com', name: 'Name' });
  for (const claims of [null, { sub: '123', email: 'x@example.com' }, { sub: '123', email: 'bad', email_verified: true }]) assert.throws(() => googleProfile(claims));
  assert.equal(googleLoginError('<script>'), '');
});
async function load(path, modules) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, URL, require(name) { if (!(name in modules)) throw Error(`Unexpected import ${name}`); return modules[name]; } });
  return exports;
}
async function callbackFixture({ binding = 'b'.repeat(64), replay = false, expired = false, identity = null, providerFailure = false } = {}) {
  const state = 'a'.repeat(64), settings = googleAuthConfig(env), calls = { sessions: [], tickets: [], exchange: 0, consumed: 0 };
  const flow = { tokenHash: security.digest(state), browserHash: security.digest('b'.repeat(64)), kind: 'GOOGLE_FLOW', expiresAt: new Date(Date.now() + (expired ? -1000 : 600000)), payload: { nonce: 'nonce', verifier: 'verifier', clientId: settings.clientId } };
  const jar = { get: () => binding ? { value: binding } : undefined, delete() {}, set() {} };
  const database = { oAuthAttempt: { findUnique: async () => flow, deleteMany: async () => { calls.consumed++; return { count: replay ? 0 : 1 }; }, create: async ({ data }) => calls.tickets.push(data) }, socialIdentity: { findUnique: async () => identity } };
  const mod = await load('app/api/auth/callback/google/route.ts', {
    'next/server': { NextResponse: { redirect: url => ({ url: url.href, headers: { set() {} } }) } },
    'next/headers': { cookies: async () => jar }, '@/lib/db': { db: () => database },
    '@/lib/auth': { beginSession: async id => calls.sessions.push(id) }, '@/lib/security.mjs': security,
    '@/lib/google-auth-policy.mjs': { googleAuthConfig: () => settings, googleProfile },
    '@/lib/google-auth': { flowCookie: 'flow', setupCookie: 'setup', cookieOptions: () => ({}), googleClient: async () => ({ client: {} }) },
    'openid-client': { authorizationCodeGrant: async (_, url, checks) => { calls.exchange++; assert.equal(url.origin, settings.origin); assert.equal(checks.expectedNonce, 'nonce'); assert.equal(checks.expectedState, state); assert.equal(checks.pkceCodeVerifier, 'verifier'); assert.equal(checks.idTokenExpected, true); if (providerFailure) throw Error('provider-secret'); return { claims: () => ({ sub: '123', email: 'user@example.com', email_verified: true }) }; } },
  });
  return { calls, run: (query = '') => mod.GET({ nextUrl: new URL(`${settings.redirectUri}?state=${state}&code=test${query}`) }) };
}
test('callback rejects missing or mismatched browser binding, expired flows and replay before token exchange', async () => {
  for (const options of [{ binding: '' }, { binding: 'c'.repeat(64) }, { expired: true }, { replay: true }]) {
    const f = await callbackFixture(options); assert.match((await f.run()).url, /google=expired/); assert.equal(f.calls.exchange, 0); assert.equal(f.calls.sessions.length, 0);
  }
});
test('cancelled and invalid-provider callbacks never issue sessions', async () => {
  const cancelled = await callbackFixture(); assert.match((await cancelled.run('&error=access_denied')).url, /google=cancelled/); assert.equal(cancelled.calls.exchange, 0);
  const failed = await callbackFixture({ providerFailure: true }); assert.match((await failed.run()).url, /google=failed/); assert.equal(failed.calls.sessions.length, 0);
});
test('only an active linked personal identity receives a session; suspended identities are blocked', async () => {
  const active = await callbackFixture({ identity: { account: { id: 'owner', status: 'ACTIVE' } } });
  assert.match((await active.run()).url, /\/dashboard$/); assert.deepEqual(active.calls.sessions, ['owner']);
  const suspended = await callbackFixture({ identity: { account: { id: 'owner', status: 'SUSPENDED' } } });
  assert.match((await suspended.run()).url, /google=failed/); assert.equal(suspended.calls.sessions.length, 0);
});
test('unknown Google identity receives a short-lived setup ticket, never an automatically linked session', async () => {
  const f = await callbackFixture(); assert.match((await f.run()).url, /\/auth\/google\/complete$/);
  assert.equal(f.calls.sessions.length, 0); assert.equal(f.calls.tickets[0].kind, 'GOOGLE_SETUP');
  assert.deepEqual(Object.keys(f.calls.tickets[0].payload).sort(), ['email', 'name', 'subject']);
});

async function finishFixture({ existing = true, passwordOK = true, consumed = false, suspended = false, consent = true, captchaOK = true } = {}) {
  const calls = { sessions: [], links: [], accounts: [], updates: 0, consumed: 0 };
  const account = existing ? { id: 'existing', email: 'user@example.com', passwordHash: 'hash', status: suspended ? 'SUSPENDED' : 'ACTIVE' } : null;
  const tx = { oAuthAttempt: { deleteMany: async () => { calls.consumed++; return { count: consumed ? 0 : 1 }; } },
    account: { updateMany: async ({ where }) => { assert.equal(where.passwordHash, 'hash'); assert.equal(where.status.not, 'SUSPENDED'); calls.updates++; return { count: 1 }; }, create: async ({ data }) => { calls.accounts.push(data); return { id: 'new' }; } },
    socialIdentity: { create: async ({ data }) => calls.links.push(data) } };
  const mod = await load('app/auth/google/actions.ts', {
    'next/headers': { cookies: async () => ({ delete() {} }) },
    'next/navigation': { redirect: url => { throw Error(`REDIRECT:${url}`); }, unstable_rethrow: e => { if (e.message.startsWith('REDIRECT:')) throw e; } },
    'openid-client': {}, '@/lib/db': { db: () => ({ account: { findUnique: async () => account }, $transaction: async run => run(tx) }) },
    '@/lib/auth': { rateLimit: async () => {}, beginSession: async id => calls.sessions.push(id) },
    '@/lib/captcha.mjs': { verifyCaptcha: async (_, action) => { assert.equal(action, 'googleComplete'); if (!captchaOK) throw new security.InputError('CAPTCHA'); } },
    '@/lib/security.mjs': { ...security, verifyPassword: async () => passwordOK },
    '@/lib/google-auth-policy.mjs': { googleAuthConfig: () => googleAuthConfig(env) },
    '@/lib/google-auth': { setupCookie: 'setup', googleSetup: async () => ({ row: { tokenHash: 'ticket' }, profile: { subject: '123', email: 'user@example.com', name: 'Name' } }) },
  });
  const form = new FormData(); for (const [k, v] of Object.entries({ username: 'newuser', displayName: 'New User', password: 'password', ...(consent ? { adult: 'on', linkConsent: 'on' } : {}), accountId: 'attacker-target' })) form.set(k, v);
  return { calls, run: () => mod.finishGoogle({}, form) };
}
test('linking existing email requires correct password, explicit consent, CAPTCHA and an eligible account', async () => {
  for (const options of [{ passwordOK: false }, { consent: false }, { suspended: true }, { captchaOK: false }, { consumed: true }]) {
    const f = await finishFixture(options); assert.ok((await f.run()).error); assert.equal(f.calls.links.length, 0); assert.equal(f.calls.sessions.length, 0);
  }
  const f = await finishFixture(); await assert.rejects(f.run(), /REDIRECT:\/dashboard/); assert.equal(f.calls.links[0].accountId, 'existing'); assert.equal(f.calls.accounts.length, 0);
});
test('new Google accounts require adult consent and never gain administrator or public-page privileges', async () => {
  const denied = await finishFixture({ existing: false, consent: false }); assert.ok((await denied.run()).error); assert.equal(denied.calls.accounts.length, 0);
  const f = await finishFixture({ existing: false }); await assert.rejects(f.run(), /REDIRECT:\/dashboard/);
  const account = f.calls.accounts[0]; assert.equal(account.status, 'ACTIVE'); assert.equal(account.role, undefined); assert.equal(account.publicPageEnabled, undefined);
  assert.match(account.passwordHash, /^google-only:/); assert.equal(await security.verifyPassword('password', account.passwordHash), false);
  assert.deepEqual(f.calls.sessions, ['new']);
});
