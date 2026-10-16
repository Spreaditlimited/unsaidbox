import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as policy from '../lib/billing-policy.mjs';
import { checkoutSummary } from '../lib/billing-display.mjs';
import { InputError } from '../lib/security.mjs';

function form(overrides = {}) {
  const f = new FormData();
  for (const [key, value] of Object.entries({ revision: '0', enabled: 'on', percentage: '20', confirmScope: 'on', ...overrides })) f.set(key, value);
  return f;
}
test('VAT validates bounded decimal percentages and rejects corrupt stored settings', () => {
  assert.deepEqual(policy.parseTaxSettings(form()), { enabled: true, basisPoints: 2000 });
  assert.equal(policy.parseTaxSettings(form({ percentage: '17.50' })).basisPoints, 1750);
  for (const percentage of ['', '-1', '0', '100.01', '1e2', '20.001', 'NaN', '20%']) assert.throws(() => policy.parseTaxSettings(form({ percentage })), InputError);
  assert.equal(policy.parseTaxSettings(form({ percentage: '0', enabled: '' })).enabled, false);
  assert.throws(() => policy.validateTaxSettings({ enabled: 'true', basisPoints: 2000 }), InputError);
  assert.throws(() => policy.validateTaxSettings({ enabled: true, basisPoints: 0 }), InputError);
});
test('VAT display adds the configured percentage on top in both currencies and periods', () => {
  const prices = policy.defaultPricing();
  const tax = { enabled: true, basisPoints: 2000 };
  assert.equal(checkoutSummary(prices, 'GBP', 'month', tax).total, '£10.80');
  assert.equal(checkoutSummary(prices, 'GBP', 'year', tax).total, '£108.00');
  assert.equal(checkoutSummary(prices, 'USD', 'month', tax).total, '$14.40');
  assert.equal(checkoutSummary(prices, 'USD', 'year', tax).total, '$144.00');
  assert.equal(checkoutSummary(prices, 'GBP', 'month', { ...tax, enabled: false }).total, '£9.00');
});
async function fixture({ authenticated = true, captcha = true, auditFails = false } = {}) {
  const state = { row: null, audits: [], writes: 0 };
  const modules = {
    'next/navigation': { unstable_rethrow(e) { if (e.message === 'redirect') throw e; } },
    'next/cache': { revalidatePath() {} },
    '@/lib/admin-auth': { requireAdministrator: async () => { if (!authenticated) throw Error('redirect'); return { id: 'admin' }; } },
    '@/lib/auth': { rateLimit: async () => {} },
    '@/lib/captcha.mjs': { verifyCaptcha: async (_, action) => { assert.equal(action, 'saveBillingTax'); if (!captcha) throw new InputError('CAPTCHA'); } },
    '@/lib/security.mjs': { InputError }, '@/lib/billing-policy.mjs': policy,
    '@/lib/db': { db: () => ({ $transaction: async callback => {
      const before = structuredClone(state);
      try { await callback({ billingConfiguration: {
        create: async ({ data }) => { if (state.row) throw Error('duplicate'); state.row = data; state.writes++; },
        updateMany: async ({ where, data }) => { if (where.id !== 'vat' || where.revision !== state.row?.revision) return { count: 0 }; state.row = { ...state.row, ...data, revision: state.row.revision + 1 }; state.writes++; return { count: 1 }; },
      }, auditEvent: { create: async ({ data }) => { if (auditFails) throw Error('audit failed'); state.audits.push(data); } } }); }
      catch (e) { Object.assign(state, before); throw e; }
    } }) },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(await readFile('app/admin/billing/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => modules[name] });
  return { state, save: value => exports.saveBillingTax({}, value) };
}
test('VAT saves require admin, CAPTCHA and explicit manual-rate confirmation', async () => {
  const denied = await fixture({ authenticated: false }); await assert.rejects(denied.save(form()), /redirect/); assert.equal(denied.state.writes, 0);
  const captcha = await fixture({ captcha: false }); assert.equal((await captcha.save(form())).error, 'CAPTCHA');
  const f = await fixture(); assert.match((await f.save(form({ confirmScope: '' }))).error, /Confirm/); assert.equal(f.state.writes, 0);
});
test('VAT is versioned separately from prices and audit failure rolls back changes', async () => {
  const f = await fixture(); assert.ok((await f.save(form())).success);
  assert.equal(f.state.row.id, 'vat'); assert.equal(f.state.row.updatedBy, 'admin'); assert.equal(f.state.row.prices.basisPoints, 2000);
  assert.ok((await f.save(form())).error); assert.equal(f.state.writes, 1);
  assert.ok((await f.save(form({ revision: '1', enabled: '', confirmScope: '' }))).success);
  assert.equal(f.state.row.prices.enabled, false); assert.equal(f.state.row.revision, 2);
  const rollback = await fixture({ auditFails: true }); assert.ok((await rollback.save(form())).error); assert.equal(rollback.state.row, null);
});
