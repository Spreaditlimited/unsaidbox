import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { appleAuthConfig, appleProfile, appleSubject, appleLoginError } from '../lib/apple-auth-policy.mjs';
import { appleClientSecret } from '../lib/apple-client-secret.mjs';
import * as security from '../lib/security.mjs';
async function finishFixture({ existing = true, passwordOK = true, consumed = false, suspended = false, consent = true, captchaOK = true } = {}) {
  const calls = { sessions: [], links: [], accounts: [], updates: 0, consumed: 0 };
  const account = existing ? { id: 'existing', email: 'user@example.com', passwordHash: 'hash', status: suspended ? 'SUSPENDED' : 'ACTIVE' } : null;
  const tx = { oAuthAttempt: { deleteMany: async () => { calls.consumed++; return { count: consumed ? 0 : 1 }; } },
    account: { updateMany: async ({ where }) => { assert.equal(where.passwordHash, 'hash'); assert.equal(where.status.not, 'SUSPENDED'); calls.updates++; return { count: 1 }; }, create: async ({ data }) => { calls.accounts.push(data); return { id: 'new' }; } },
    socialIdentity: { create: async ({ data }) => calls.links.push(data) } };
  const mod = await load('app/auth/apple/actions.ts', {
    'next/headers': { cookies: async () => ({ delete() {} }) },
    'next/navigation': { redirect: url => { throw Error(`REDIRECT:${url}`); }, unstable_rethrow: e => { if (e.message.startsWith('REDIRECT:')) throw e; } },
    'openid-client': {}, '@/lib/db': { db: () => ({ account: { findUnique: async () => account }, $transaction: async run => run(tx) }) },
    '@/lib/auth': { rateLimit: async () => {}, beginSession: async id => calls.sessions.push(id) },
    '@/lib/captcha.mjs': { verifyCaptcha: async (_, action) => { assert.equal(action, 'appleComplete'); if (!captchaOK) throw new security.InputError('CAPTCHA'); } },
    '@/lib/security.mjs': { ...security, verifyPassword: async () => passwordOK },
    '@/lib/apple-auth-policy.mjs': { appleAuthConfig: () => appleAuthConfig(env) },
    '@/lib/apple-auth': { setupCookie: 'setup', appleSetup: async () => ({ row: { tokenHash: 'ticket' }, profile: { subject: '123', email: 'user@example.com', name: 'Name' } }) },
  });
  const form = new FormData(); for (const [k, v] of Object.entries({ username: 'newuser', displayName: 'New User', password: 'password', ...(consent ? { adult: 'on', linkConsent: 'on' } : {}), accountId: 'attacker-target' })) form.set(k, v);
  return { calls, run: () => mod.finishApple({}, form) };
}
test('linking existing email requires correct password, explicit consent, CAPTCHA and an eligible account', async () => {
  for (const options of [{ passwordOK: false }, { consent: false }, { suspended: true }, { captchaOK: false }, { consumed: true }]) {
    const f = await finishFixture(options); assert.ok((await f.run()).error); assert.equal(f.calls.links.length, 0); assert.equal(f.calls.sessions.length, 0);
  }
  const f = await finishFixture(); await assert.rejects(f.run(), /REDIRECT:\/dashboard/); assert.equal(f.calls.links[0].accountId, 'existing'); assert.equal(f.calls.accounts.length, 0);
});
test('new Apple accounts require adult consent and never gain administrator or public-page privileges', async () => {
  const denied = await finishFixture({ existing: false, consent: false }); assert.ok((await denied.run()).error); assert.equal(denied.calls.accounts.length, 0);
  const f = await finishFixture({ existing: false }); await assert.rejects(f.run(), /REDIRECT:\/dashboard/);
  const account = f.calls.accounts[0]; assert.equal(account.status, 'ACTIVE'); assert.equal(account.role, undefined); assert.equal(account.publicPageEnabled, undefined);
  assert.match(account.passwordHash, /^apple-only:/); assert.equal(await security.verifyPassword('password', account.passwordHash), false);
  assert.deepEqual(f.calls.sessions, ['new']);
});

const env = { NODE_ENV: 'development', UNSAIDBOX_APPLE_AUTH_TEST_CLIENT_ID: 'com.unsaidbox.test', UNSAIDBOX_APPLE_AUTH_TEST_TEAM_ID: 'TEAM', UNSAIDBOX_APPLE_AUTH_TEST_KEY_ID: 'KEY', UNSAIDBOX_APPLE_AUTH_TEST_PRIVATE_KEY: 'test-only', UNSAIDBOX_APPLE_AUTH_TEST_ORIGIN: 'https://auth-test.example.com' };
test('Apple requires explicit HTTPS development configuration, with no live-key or preview fallback', () => {
  assert.equal(appleAuthConfig(env).redirectUri, 'https://auth-test.example.com/api/auth/callback/apple');
  for (const origin of ['http://localhost:3001', 'https://localhost', 'https://127.0.0.1', 'https://user:pass@example.com', 'https://example.com/path']) assert.equal(appleAuthConfig({ ...env, UNSAIDBOX_APPLE_AUTH_TEST_ORIGIN: origin }), null);
  assert.equal(appleAuthConfig({ ...env, NODE_ENV: 'production' }), null);
  assert.equal(appleAuthConfig({ ...env, VERCEL: '1', VERCEL_ENV: 'preview' }), null);
});
test('Apple accepts verified private relay addresses, rejects unverified email and does not trust names', () => {
  for (const domain of ['privaterelay.appleid.com', 'private.icloud.com']) assert.deepEqual(appleProfile({ sub: '001.abc-123', email: `user@${domain}`, email_verified: 'true', name: 'untrusted' }), { subject: '001.abc-123', email: `user@${domain}`, name: '' });
  assert.throws(() => appleProfile({ sub: '123', email: 'user@example.com', email_verified: 'false' }));
  assert.throws(() => appleSubject({ sub: 'x'.repeat(256) }));
  assert.equal(appleLoginError('<script>'), '');
});
test('Apple client secrets are valid ES256 assertions scoped to the Services ID and expire in five minutes', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const token = appleClientSecret({ privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }), teamId: 'TEAM', keyId: 'KEY', clientId: 'com.unsaidbox.test' }, 1000);
  const [header, payload, signature] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'ES256', kid: 'KEY' });
  assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url')), { iss: 'TEAM', iat: 1000, exp: 1300, aud: 'https://appleid.apple.com', sub: 'com.unsaidbox.test' });
  assert.equal(verify('sha256', Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')), true);
});
async function load(path, modules) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, URL, URLSearchParams, Buffer, Request, require(name) { if (!(name in modules)) throw Error(`Unexpected import ${name}`); return modules[name]; } });
  return exports;
}
async function callbackFixture({ binding = 'b'.repeat(64), replay = false, expired = false, identity = null, providerFailure = false, kind = 'APPLE_FLOW', claims = { sub: '001.abc', email: 'user@private.icloud.com', email_verified: true } } = {}) {
  const state = 'a'.repeat(64), settings = appleAuthConfig(env), calls = { sessions: [], tickets: [], exchange: 0 };
  const flow = { tokenHash: security.digest(state), browserHash: security.digest('b'.repeat(64)), kind, expiresAt: new Date(Date.now() + (expired ? -1000 : 600000)), payload: { nonce: 'nonce', clientId: settings.clientId } };
  const database = { oAuthAttempt: { findUnique: async () => flow, deleteMany: async () => ({ count: replay ? 0 : 1 }), create: async ({ data }) => calls.tickets.push(data) }, socialIdentity: { findUnique: async ({ where }) => { assert.equal(where.provider_subject.provider, 'apple'); return identity; } } };
  const mod = await load('app/api/auth/callback/apple/route.ts', {
    'next/server': { NextResponse: { redirect: url => ({ url: url.href, headers: { set() {} } }) } },
    'next/headers': { cookies: async () => ({ get: () => binding ? { value: binding } : undefined, delete() {}, set() {} }) },
    '@/lib/db': { db: () => database }, '@/lib/auth': { beginSession: async id => calls.sessions.push(id) }, '@/lib/security.mjs': security,
    '@/lib/apple-auth-policy.mjs': { appleAuthConfig: () => settings, appleSubject, appleProfile },
    '@/lib/apple-auth': { flowCookie: 'flow', setupCookie: 'setup', cookieOptions: () => ({}), appleClient: async () => ({ client: {} }) },
    'openid-client': { authorizationCodeGrant: async (_, request, checks) => { calls.exchange++; assert.equal(request.method, 'POST'); assert.equal(request.url, settings.redirectUri); assert.equal(checks.expectedNonce, 'nonce'); assert.equal(checks.expectedState, state); assert.equal(checks.idTokenExpected, true); if (providerFailure) throw Error('provider-secret'); return { claims: () => claims }; } },
  });
  return { calls, run: (extra = '') => mod.POST(new Request(settings.redirectUri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `state=${state}&code=test${extra}` })) };
}
test('Apple POST rejects missing or mismatched cookies, replay, expiry and other providers before exchange', async () => {
  for (const options of [{ binding: '' }, { binding: 'c'.repeat(64) }, { replay: true }, { expired: true }, { kind: 'GOOGLE_FLOW' }]) { const f = await callbackFixture(options); assert.match((await f.run()).url, /apple=expired/); assert.equal(f.calls.exchange, 0); }
});
test('Apple callback bounds bodies, rejects duplicate state, handles cancellation and invalid tokens safely', async () => {
  for (const extra of ['&state=duplicate', '&junk=' + 'a'.repeat(17000)]) { const f = await callbackFixture(); assert.match((await f.run(extra)).url, /apple=failed/); assert.equal(f.calls.exchange, 0); }
  const cancel = await callbackFixture(); assert.match((await cancel.run('&error=access_denied')).url, /apple=cancelled/); assert.equal(cancel.calls.exchange, 0);
  const invalid = await callbackFixture({ providerFailure: true }); assert.match((await invalid.run()).url, /apple=failed/); assert.equal(invalid.calls.sessions.length, 0);
});
test('Apple stable identity signs in without requiring repeated email claims; suspended accounts never sign in', async () => {
  const active = await callbackFixture({ identity: { account: { id: 'owner', status: 'ACTIVE' } }, claims: { sub: '001.abc' } });
  assert.match((await active.run()).url, /\/dashboard$/); assert.deepEqual(active.calls.sessions, ['owner']);
  const suspended = await callbackFixture({ identity: { account: { id: 'owner', status: 'SUSPENDED' } } });
  assert.match((await suspended.run()).url, /apple=failed/); assert.equal(suspended.calls.sessions.length, 0);
  const fresh = await callbackFixture(); assert.match((await fresh.run()).url, /\/auth\/apple\/complete$/); assert.equal(fresh.calls.sessions.length, 0); assert.equal(fresh.calls.tickets[0].kind, 'APPLE_SETUP');
});
