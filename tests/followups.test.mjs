import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import * as security from '../lib/security.mjs';
import * as policy from '../lib/followup-policy.mjs';
import { analyticsPage } from '../lib/analytics-policy.mjs';

function conversation(overrides = {}) {
  return { id: 'cfixture123456789012345678', accountId: 'owner', tokenHash: security.digest('a'.repeat(64)), expiresAt: new Date(Date.now() + 86400000), closedAt: null, messageCount: 0, account: { status: 'ACTIVE' }, submission: { status: 'PENDING' }, ...overrides };
}
function form(values = {}) {
  const f = new FormData();
  for (const [key, value] of Object.entries({ body: 'Could you share more context?', requestKey: randomUUID(), ...values })) f.set(key, value);
  return f;
}
async function fixture({ owner = 'owner', sender = true, captcha = true, overrides = {} } = {}) {
  const state = { conversation: conversation(overrides), messages: [], writes: 0, cookie: null, reports: [] };
  const client = {
    followupConversation: {
      findUnique: async ({ where }) => where.tokenHash && where.tokenHash !== state.conversation.tokenHash ? null : state.conversation,
      updateMany: async ({ where, data }) => {
        if (where.id !== state.conversation.id || where.accountId && where.accountId !== state.conversation.accountId || where.tokenHash && where.tokenHash !== state.conversation.tokenHash) return { count: 0 };
        Object.assign(state.conversation, data); state.writes++; return { count: 1 };
      },
      update: async ({ data }) => { if (data.messageCount) { state.conversation.messageCount++; data = { ...data }; delete data.messageCount; } Object.assign(state.conversation, data); },
    },
    followupMessage: {
      findUnique: async ({ where }) => state.messages.find(m => m.requestKey === where.conversationId_requestKey.requestKey) ?? null,
      create: async ({ data }) => { state.messages.push(data); },
    },
    report: { create: async ({ data }) => state.reports.push(data) },
  };
  client.$transaction = async fn => { const before = structuredClone(state); try { return await fn(client); } catch (e) { Object.assign(state, before); throw e; } };
  const modules = {
    'next/headers': { cookies: async () => ({ set: (...args) => { state.cookie = args; } }) },
    'next/cache': { revalidatePath() {} },
    'next/navigation': { unstable_rethrow: e => { if (e.message === 'AUTH_REQUIRED') throw e; } },
    '@/lib/db': { db: () => client },
    '@/lib/auth': { requireAccount: async () => { if (!owner) throw Error('AUTH_REQUIRED'); return { id: owner }; }, rateLimit: async () => {} },
    '@/lib/captcha.mjs': { verifyCaptcha: async () => { if (!captcha) throw new security.InputError('CAPTCHA rejected'); } },
    '@/lib/security.mjs': security,
    '@/lib/followup-policy.mjs': policy,
    '@/lib/followups': { followupRelations: {}, senderConversation: async () => sender ? state.conversation : null },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(await readFile('app/follow-up/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, console, process: { env: { NODE_ENV: 'production' } }, require: name => { if (!modules[name]) throw Error(name); return modules[name]; } });
  return { state, open: f => exports.openFollowup({}, f), reply: (f = form(), asOwner = true) => exports.replyFollowup(state.conversation.id, asOwner, {}, f), close: (asOwner = true) => exports.closeFollowup(state.conversation.id, asOwner, {}, form()), report: f => exports.reportFollowup(state.conversation.id, {}, f) };
}
test('private conversation policy rejects expiry, suspension, spam, blocked forms, closure and limits', () => {
  assert.doesNotThrow(() => policy.assertFollowupOpen(conversation()));
  for (const patch of [{ expiresAt: new Date(0) }, { account: { status: 'SUSPENDED' } }, { submission: { status: 'SPAM' } }, { entry: { form: { blocked: true } } }, { closedAt: new Date() }, { messageCount: 100 }]) assert.throws(() => policy.assertFollowupOpen(conversation(patch)));
  assert.equal(policy.followupAvailable(conversation({ submission: null, entry: null })), false);
  assert.equal(policy.followupAvailable(conversation({ entry: { form: { blocked: false } } })), false);
  assert.equal(policy.followupAvailable(conversation({ submission: null, entry: { form: { blocked: false } } })), true);
  assert.equal(policy.validFollowupToken('a'.repeat(64)), true);
  for (const token of ['', 'a'.repeat(63), 'x'.repeat(64), null]) assert.equal(policy.validFollowupToken(token), false);
});
test('return link exchanges only a valid secret for a secure path-scoped cookie', async () => {
  const f = await fixture();
  assert.ok((await f.open(form({ returnToken: 'b'.repeat(64) }))).error);
  assert.equal(f.state.cookie, null);
  assert.equal((await f.open(form({ returnToken: 'a'.repeat(64) }))).conversationId, f.state.conversation.id);
  const [name, value, options] = f.state.cookie;
  assert.equal(name, 'unsaidbox_followup'); assert.equal(value, 'a'.repeat(64));
  assert.equal(options.httpOnly, true); assert.equal(options.secure, true); assert.equal(options.sameSite, 'strict');
  assert.equal(options.path, `/follow-up/${f.state.conversation.id}`);
});
test('CAPTCHA and owner authentication are enforced before reply writes', async () => {
  const c = await fixture({ captcha: false });
  assert.match((await c.reply()).error, /CAPTCHA/); assert.equal(c.state.writes, 0);
  const a = await fixture({ owner: null });
  await assert.rejects(a.reply(), /AUTH_REQUIRED/); assert.equal(a.state.writes, 0);
});
test('another owner or a sender without the capability cannot read through a reply or close', async () => {
  const f = await fixture({ owner: 'another-owner' });
  assert.ok((await f.reply()).error); assert.ok((await f.close()).error);
  assert.equal(f.state.messages.length, 0); assert.equal(f.state.conversation.closedAt, null);
  const s = await fixture({ sender: false });
  assert.ok((await s.reply(form(), false)).error); assert.ok((await s.close(false)).error);
});
test('replies are private, idempotent and bound to their author', async () => {
  const f = await fixture(); const data = form();
  assert.ok((await f.reply(data)).success); assert.ok((await f.reply(data)).success);
  assert.equal(f.state.messages.length, 1); assert.equal(f.state.conversation.messageCount, 1);
  assert.equal(f.state.messages[0].author, 'OWNER'); assert.equal(f.state.messages[0].publicVisible, undefined);
  assert.ok((await f.reply(data, false)).error);
  assert.ok((await f.reply(form({ body: 'Thank you for asking.' }), false)).success);
  assert.equal(f.state.messages[1].author, 'SENDER');
});
test('closing blocks future replies, and reporting closes the conversation', async () => {
  const f = await fixture(); assert.ok((await f.close(false)).success); assert.ok((await f.reply()).error);
  const r = await fixture(); assert.ok((await r.report(form({ reason: 'The owner asked for identifying information.' }))).success);
  assert.equal(r.state.reports.length, 1); assert.ok(r.state.conversation.closedAt);
});
test('boundaries enforce reply length, request key and suspension on the server', async () => {
  for (const values of [{ body: '' }, { body: 'a'.repeat(3001) }, { requestKey: 'invalid' }]) {
    const f = await fixture(); assert.ok((await f.reply(form(values))).error); assert.equal(f.state.messages.length, 0);
  }
  for (const overrides of [{ messageCount: 100 }, { closedAt: new Date() }, { account: { status: 'SUSPENDED' } }]) {
    const f = await fixture({ overrides }); assert.ok((await f.reply()).error); assert.equal(f.state.messages.length, 0);
  }
});
test('follow-up paths are excluded from analytics, sitemap and indexing', async () => {
  assert.equal(analyticsPage('/follow-up'), null);
  assert.equal(analyticsPage('/follow-up/cfixture'), null);
  assert.match(await readFile('app/robots.ts', 'utf8'), /"\/follow-up"/);
  assert.doesNotMatch(await readFile('app/sitemap.ts', 'utf8'), /followupConversation/);
  assert.match(await readFile('app/follow-up/unlock.tsx', 'utf8'), /replaceState/);
});
