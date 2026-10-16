import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as policy from '../lib/plan-policy.mjs';
import * as runtime from '../lib/billing-runtime.mjs';
import * as security from '../lib/security.mjs';

async function load(file, modules, env = { UNSAID_BILLING_MODE: 'test' }) {
  const exports = {};
  const code = ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, Buffer, File, process: { env }, require(name) {
    if (!(name in modules)) throw Error(`Unexpected import ${name}`);
    return modules[name];
  } });
  return exports;
}
async function planFixture({ used = 0, subscription = null, count = 0, baseline = 0, limits = policy.plans } = {}) {
  const state = { used, warnings: 0, locks: 0 };
  const tx = {
    account: { findUniqueOrThrow: async () => ({ createdAt: new Date('2025-01-15T10:30:00Z') }) },
    $queryRaw: async () => { state.locks++; },
    billingCustomer: { findUnique: async () => ({ subscriptions: subscription ? [subscription] : [] }) },
    question: { count: async () => count, findMany: async () => [{ id: 'allowed' }] },
    feedbackForm: { count: async () => count, findMany: async () => [{ id: 'allowed' }] },
    submission: { count: async () => baseline }, feedbackEntry: { count: async () => 2 },
    planUsage: {
      findMany: async () => [],
      findUnique: async () => state.used === null ? null : { submissions: state.used },
      create: async ({ data }) => { state.used = data.submissions; return { ...data }; },
      update: async () => { state.used++; },
    },
  };
  const api = await load('lib/plans.ts', {
    'server-only': {}, './db': { db: () => tx }, './billing-runtime.mjs': runtime,
    './plan-policy.mjs': { ...policy, planMode: () => 'test' }, './security.mjs': security,
    './plan-configuration': { getPlanConfiguration: async () => ({ plans: limits }) },
    './email-queue.mjs': { queueUsageWarning: async () => { state.warnings++; } },
  });
  return { api, tx, state };
}

test('Pro share branding is available without saved settings, while Free stays branded', async () => {
  let entitled = false;
  let saved = null;
  const api = await load('lib/branding.ts', {
    'server-only': {},
    './plans': { accountPlan: async () => ({ enforced: true, limits: { branding: entitled } }) },
    './db': { db: () => ({ brandSettings: { findUnique: async ({ where }) => {
      assert.equal(where.accountId, 'owner');
      return saved;
    } } }) },
  });
  assert.equal(await api.shareBrand('owner'), null);
  entitled = true;
  const defaults = await api.shareBrand('owner');
  assert.equal(defaults.name, '');
  assert.equal(defaults.hideAttribution, false);
  saved = { name: 'My brand', accent: '#5850B8', hideAttribution: true, logo: null };
  assert.equal((await api.shareBrand('owner')).hideAttribution, true);
  saved = { ...saved, name: '' };
  assert.equal((await api.shareBrand('owner')).name, '');
  assert.equal((await api.shareBrand('owner')).hideAttribution, true);
  entitled = false;
  assert.equal(await api.shareBrand('owner'), null);
});

test('saved Free and Pro allowances enforce response and active-link limits without resetting usage', async () => {
  const limits = { free: { ...policy.plans.free, submissions: 2, questions: 1, forms: 1 }, pro: { ...policy.plans.pro, submissions: 4, questions: 2, forms: 2 } };
  for (const subscription of [null, { mode: 'test', recognized: true, status: 'active', paidThrough: new Date(Date.now()+86400000), allowanceAnchor: new Date('2026-01-10') }]) {
    const tier = subscription ? 'pro' : 'free';
    const {api,tx,state}=await planFixture({limits,subscription,used:limits[tier].submissions,count:limits[tier].questions});
    assert.equal((await api.accountPlan('owner')).limits.submissions,limits[tier].submissions);
    await assert.rejects(api.consumeSubmission(tx,'owner'),/allowance/);
    assert.equal(state.used,limits[tier].submissions);
    await assert.rejects(api.assertActiveSlot(tx,'owner','questions'),/active questions/);
    await assert.rejects(api.assertActiveSlot(tx,'owner','forms'),/active forms/);
    limits[tier].submissions++;
    await api.consumeSubmission(tx,'owner');
    assert.equal(state.used,limits[tier].submissions);
  }
});

test('sandbox entitlements never enable production features', () => {
  assert.equal(policy.planMode({ UNSAID_BILLING_MODE: 'test' }), 'test');
  for (const env of [{}, { UNSAID_BILLING_MODE: 'live' }, { UNSAID_BILLING_MODE: 'test', NODE_ENV: 'production' }, { UNSAID_BILLING_MODE: 'test', VERCEL: '1' }]) assert.equal(policy.planMode(env), null);
});
test('calendar usage resets at UTC month boundary and warns at 80%', () => {
  const month = policy.usageMonth(new Date('2026-12-31T23:59:59Z'));
  assert.equal(month.key, '2026-12'); assert.equal(month.end.toISOString(), '2027-01-01T00:00:00.000Z');
  assert.equal(policy.usageLevel(399, 500), 'normal'); assert.equal(policy.usageLevel(400, 500), 'warning'); assert.equal(policy.usageLevel(500, 500), 'full');
});
test('spreadsheet exports escape formulas, quotes and multiline text', () => {
  for (const value of ['=SUM(1,2)', ' +1', '@SUM(A1)', '-3', '\ttext', '\n=1']) assert.ok(policy.csvCell(value).startsWith('"\''));
  assert.equal(policy.csvCell('He said "Hi"'), '"He said ""Hi"""');
  assert.equal(policy.csvDocument([['one', 'two\nlines']]), '\uFEFF"one","two\nlines"\r\n');
});
test('only verified unexpired matching-mode subscriptions grant Pro', async () => {
  const good = { mode: 'test', recognized: true, status: 'active', paidThrough: new Date(Date.now() + 86400000) };
  for (const [subscription, expected] of [[good, 'pro'], [{ ...good, mode: 'live' }, 'free'], [{ ...good, recognized: false }, 'free'], [{ ...good, paidThrough: new Date(0) }, 'free'], [{ ...good, status: 'canceled' }, 'free'], [{ ...good, cancelAtPeriodEnd: true }, 'pro']]) {
    const { api } = await planFixture({ subscription });
    assert.equal((await api.accountPlan('owner')).key, expected);
    if (expected === 'free') await assert.rejects(api.requirePlanFeature('owner', 'csv'), /verified Pro/);
  }
});
test('usage counts once, warns once at threshold, refuses overage and seeds existing submissions', async () => {
  const { api, tx, state } = await planFixture({ used: 399 });
  await api.lockPlanOwner(tx, 'owner'); assert.equal(state.locks, 1);
  await api.consumeSubmission(tx, 'owner'); await api.consumeSubmission(tx, 'owner');
  assert.equal(state.used, 401); assert.equal(state.warnings, 1);
  state.used = 500;
  await assert.rejects(api.consumeSubmission(tx, 'owner'), /monthly response allowance/);
  assert.equal(state.used, 500);
  const seeded = await planFixture({ used: null, baseline: 10 });
  await seeded.api.consumeSubmission(seeded.tx, 'owner'); assert.equal(seeded.state.used, 13);
});
test('question limits explain exactly how many links to pause and offer upgrades only for Free', async () => {
  for (const [count,expected] of [[3,'pause 1 existing question:'],[11,'pause 9 existing questions:']]) {
    const {api,tx} = await planFixture({count});
    await assert.rejects(api.assertActiveSlot(tx,'owner','questions'), error => {
      assert.ok(error.message.includes(expected));
      assert.match(error.message,/at a time, not per month/);
      assert.match(error.message,/uncheck “Accept new answers”, then click “Save question”/);
      assert.equal(error.upgradeAvailable,true);
      return true;
    });
  }
  const pro = await planFixture({count:25,subscription:{mode:'test',recognized:true,status:'active',paidThrough:new Date(Date.now()+86400000)}});
  await assert.rejects(pro.api.assertActiveSlot(pro.tx,'owner','questions'), error => error.upgradeAvailable === false);
  const component = await readFile('components/ActionForm.tsx','utf8');
  assert.match(component,/state\.upgradeAvailable[\s\S]*?href="\/dashboard\/billing#upgrade-pro">Upgrade to Pro/);
  assert.match(component,/className="plan-upgrade-link"/);
  const css = await readFile('app/globals.css','utf8');
  assert.match(css,/\.form-error \.plan-upgrade-link\s*\{[^}]*text-decoration: underline/);
  assert.match(css,/\.form-error \.plan-upgrade-link:focus-visible\s*\{[^}]*outline:/);
});

test('active-resource caps allow editing existing links and reject excess downgraded links', async () => {
  const { api, tx, state } = await planFixture({ count: 3 });
  await assert.rejects(api.assertActiveSlot(tx, 'owner', 'questions'), /3 active questions/);
  await api.assertActiveSlot(tx, 'owner', 'questions', true);
  await assert.rejects(api.consumeSubmission(tx, 'owner', 'excess'), /temporarily not accepting/);
  assert.equal(state.used, 0);
  await api.consumeSubmission(tx, 'owner', 'allowed'); assert.equal(state.used, 1);
});

async function exportFixture(allowed = true) {
  let query; let writes = 0; let brandWrite;
  const api = await load('app/dashboard/billing/features-actions.ts', {
    'next/navigation': { unstable_rethrow() {} }, 'next/cache': { revalidatePath() {} },
    '@/lib/auth': { requireAccount: async () => ({ id: 'owner' }), rateLimit: async () => {} },
    '@/lib/captcha.mjs': { verifyCaptcha: async () => {} },
    '@/lib/plans': { requirePlanFeature: async () => { if (!allowed) throw new security.InputError('Pro required'); } },
    '@/lib/db': { db: () => ({
      submission: { findMany: async args => { query = args; return [{ id: 'response', createdAt: new Date('2026-10-07'), body: 'original', publicBody: '=sanitized', question: null }]; } },
      feedbackAnswer: { findMany: async args => { query = args; return []; } },
      brandSettings: { upsert: async args => { writes++; brandWrite=args; } },
    }) },
    '@/lib/security.mjs': security, '@/lib/avatar-image.mjs': {}, '@/lib/plan-policy.mjs': policy,
  });
  return { api, query: () => query, writes: () => writes, brandWrite:()=>brandWrite };
}
test('CSV exports require Pro and scope every batch to owner and share consent', async () => {
  const form = new FormData(); form.set('source', 'messages'); form.set('month', '2026-10');
  const denied = await exportFixture(false);
  assert.equal((await denied.api.exportResponses(form)).error, 'Pro required'); assert.equal(denied.query(), undefined);
  const f = await exportFixture(); const result = await f.api.exportResponses(form);
  assert.equal(f.query().where.accountId, 'owner'); assert.equal(f.query().where.sharingPolicy, 'OWNER_MAY_SHARE');
  assert.equal(f.query().where.status, 'APPROVED'); assert.equal(f.query().take, 201);
  assert.match(result.csv, /'=sanitized/); assert.doesNotMatch(result.csv, /original/);
  form.set('source', 'forms'); form.set('cursor', 'lastrecord'); await f.api.exportResponses(form);
  assert.equal(f.query().where.entry.form.accountId, 'owner'); assert.equal(f.query().where.entry.shareAllowed, true);
  assert.equal(f.query().where.entry.form.allowSharing, true); assert.equal(f.query().where.entry.form.blocked, false);
  assert.equal(f.query().where.id.gt, 'lastrecord');
});
test('branding rejects unpaid and unreadable settings before writing', async () => {
  const form = new FormData(); form.set('name', 'My brand'); form.set('accent', '#FFFFFF');
  const f = await exportFixture(); assert.match((await f.api.saveBrand(form)).error, /darker accent/); assert.equal(f.writes(), 0);
  const denied = await exportFixture(false); assert.equal((await denied.api.saveBrand(form)).error, 'Pro required'); assert.equal(denied.writes(), 0);
});

test('submission routes reserve usage inside owner-locked transactions; deletion never refunds usage', async () => {
  const messages = await readFile('app/actions.ts', 'utf8');
  const forms = await readFile('app/dashboard/forms/actions.ts', 'utf8');
  const send = messages.slice(messages.indexOf('export async function submitMessage'), messages.indexOf('export async function', messages.indexOf('export async function submitMessage') + 1));
  assert.match(send, /\$transaction[\s\S]*lockPlanOwner[\s\S]*consumeSubmission[\s\S]*tx\.submission\.create/);
  assert.match(send, /isolationLevel: 'ReadCommitted'/);
  const submit = forms.slice(forms.indexOf('export async function submitFeedbackForm'), forms.indexOf('export async function deleteFeedbackEntry'));
  assert.match(submit, /lockPlanOwner[\s\S]*if \(previous\)[\s\S]*else \{\s*await consumeSubmission[\s\S]*tx\.feedbackEntry\.create/);
  assert.match(submit, /isolationLevel: 'ReadCommitted'/);
  assert.doesNotMatch(messages + forms, /planUsage\.(delete|deleteMany)|submissions:\s*\{\s*decrement/);
});

test('Pro branding can clear a name while preserving independent logo and attribution choices',async()=>{
  for(const name of ['', '   ']){
    const f=await exportFixture();const form=new FormData();form.set('accountId','forged-owner');form.set('name',name);form.set('accent','#5850B8');form.set('hideAttribution','on');
    assert.ok((await f.api.saveBrand(form)).success);
    const saved=f.brandWrite();assert.equal(saved.where.accountId,'owner');assert.equal(saved.update.name,'');assert.equal(saved.create.name,'');assert.equal(saved.update.hideAttribution,true);assert.equal('logo' in saved.update,false);
  }
  const f=await exportFixture();const invalid=new FormData();invalid.set('name','x'.repeat(61));invalid.set('accent','#5850B8');assert.ok((await f.api.saveBrand(invalid)).error);assert.equal(f.writes(),0);
});
