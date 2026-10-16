import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as security from '../lib/security.mjs';
import * as policy from '../lib/billing-policy.mjs';
import * as runtime from '../lib/billing-runtime.mjs';

async function fixture() {
  const state = {
    customer: { id: 'binding', accountId: 'owner', mode: 'test', stripeCustomerId: 'cus_owner', lockToken: null, lockUntil: null },
    sessions: {}, subscriptions: [], requests: [], expireCount: 0, failAfterCreate: false, revision: 1,
    tax: { enabled: false, basisPoints: 2000, revision: 0 }, taxRates: [], taxFailure: false,
  };
  const mapping = key => { const field = policy.priceFields.find(f => f.key === key); return { mode: 'test', stripePriceId: `price_${key}`, stripeProductId: 'product', amount: field.defaultAmount, currency: field.currency.toLowerCase(), interval: field.interval }; };
  const client = { billingCustomer: {
    upsert: async ({ where }) => { assert.equal(where.accountId_mode.accountId, 'owner'); return { ...state.customer }; },
    findUniqueOrThrow: async () => ({ ...state.customer }),
    updateMany: async ({ where, data }) => {
      if (where.OR && state.customer.lockUntil > new Date()) return { count: 0 };
      if (where.lockToken && state.customer.lockToken !== where.lockToken) return { count: 0 };
      if (where.lockUntil?.gt && state.customer.lockUntil <= where.lockUntil.gt) return { count: 0 };
      Object.assign(state.customer, data); return { count: 1 };
    },
  }, billingPrice: { findUnique: async ({ where }) => mapping(where.mode_catalogRevision_priceKey.priceKey) } };
  const stripe = {
    taxRates: {
      list: async () => { if (state.taxFailure) throw Error('tax rate permission denied'); return { data: state.taxRates, has_more: false }; },
      create: async params => { const rate = { id: `txr_${state.taxRates.length}`, ...params, livemode: false, active: true }; state.taxRates.push(rate); return rate; },
    },
    prices: { retrieve: async id => { const m = mapping(id.slice(6)); return { id, livemode: false, active: true, type: 'recurring', unit_amount: m.amount, currency: m.currency, recurring: { interval: m.interval, interval_count: 1, usage_type: 'licensed' }, billing_scheme: 'per_unit', product: { id: 'product', active: true } }; } },
    subscriptions: { list: async () => ({ data: state.subscriptions, has_more: false }) },
    checkout: { sessions: {
      retrieve: async id => Object.values(state.sessions).find(s => s.id === id),
      expire: async id => { Object.values(state.sessions).find(s => s.id === id).status = 'expired'; state.expireCount++; },
      create: async (params, { idempotencyKey }) => {
        state.requests.push({ params, key: idempotencyKey });
        if (state.createError) throw state.createError;
        if (!state.sessions[idempotencyKey] && params.expires_at && state.expiryWithoutParam) throw Object.assign(Error('The `expires_at` timestamp must be at least 30 minutes from Checkout Session creation.'), { type: 'StripeInvalidRequestError', statusCode: 400 });
        if (!state.sessions[idempotencyKey] && params.expires_at) throw Object.assign(Error('expiry rejected'), { type: 'StripeInvalidRequestError', statusCode: 400, param: 'expires_at' });
        if (!state.sessions[idempotencyKey]) state.sessions[idempotencyKey] = { id: `cs_${Object.keys(state.sessions).length}`, customer: params.customer, livemode: false, metadata: params.metadata, status: 'open', url: 'https://checkout.stripe.com/c/pay/cs_test' };
        if (state.failAfterCreate) { state.failAfterCreate = false; throw Error('network interrupted after Stripe accepted'); }
        return state.sessions[idempotencyKey];
      },
    } },
  };
  let sequence = 0;
  const modules = { 'server-only': {}, 'node:crypto': { randomUUID: () => `key_${++sequence}` }, '@/generated/prisma': {}, './db': { db: () => client }, './stripe': { stripeClient: () => stripe }, './security.mjs': security, './email-config.mjs': { appOrigin: () => 'http://localhost:3001' }, './billing-pricing': { getBillingPricing: async () => ({ revision: state.revision, prices: policy.defaultPricing(), tax: { ...state.tax } }) }, './billing-runtime.mjs': { ...runtime, billingEnvironment: () => ({ mode: 'test' }) }, './billing-policy.mjs': policy };
  const exports = {};
  modules['@/generated/prisma'] = { Prisma: { DbNull: null } };
  const code = ts.transpileModule(await readFile('lib/billing.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, process: { env: { UNSAID_STRIPE_TEST_WEBHOOK_SECRET: 'whsec_test_fixture' } }, require: name => { if (!modules[name]) throw Error(`Unexpected ${name}`); return modules[name]; } });
  return { state, checkout: (key = 'gbpMonthly', revision = 1, taxRevision = state.tax.revision) => exports.beginCheckout({ id: 'owner', email: 'fixture@example.test' }, key, revision, taxRevision) };
}
test('repeated checkout reuses the existing session rather than creating a second payment', async () => {
  const f = await fixture(); await f.checkout(); await f.checkout();
  assert.equal(f.state.requests.length, 1); assert.equal(f.state.customer.lockToken, null);
});
test('new sessions let Stripe set expiry', async () => {
  const f = await fixture(); await f.checkout();
  assert.equal('expires_at' in f.state.requests[0].params, false);
});
test('explicit legacy expiry rejection recovers with a new key and current settings', async () => {
  const f = await fixture();
  Object.assign(f.state.customer, { checkoutKey: 'legacy', checkoutParams: { expires_at: 123, customer: 'cus_owner' }, checkoutStartedAt: new Date() });
  await f.checkout();
  assert.equal(f.state.requests.length, 2);
  assert.equal(f.state.requests[0].key, 'legacy');
  assert.notEqual(f.state.requests[1].key, 'legacy');
  assert.equal('expires_at' in f.state.requests[1].params, false);
  assert.equal(Object.keys(f.state.sessions).length, 1);
});
test('ambiguous errors and unrelated rejections preserve the saved attempt', async () => {
  for (const error of [Error('network'), { type: 'StripePermissionError', statusCode: 403 }, { type: 'StripeInvalidRequestError', statusCode: 400, param: 'customer' }]) {
    const f = await fixture();
    Object.assign(f.state.customer, { checkoutKey: 'legacy', checkoutParams: { expires_at: 123 }, checkoutStartedAt: new Date() });
    f.state.createError = error;
    await assert.rejects(f.checkout());
    assert.equal(f.state.requests.length, 1);
    assert.equal(f.state.customer.checkoutKey, 'legacy');
  }
});
test('recovers the exact production expiry error when Stripe omits param', async () => {
  const f = await fixture(); f.state.expiryWithoutParam = true;
  Object.assign(f.state.customer, { checkoutKey: 'legacy', checkoutParams: { expires_at: 123, customer: 'cus_owner' }, checkoutStartedAt: new Date() });
  await f.checkout();
  assert.equal(f.state.requests.length, 2);
  assert.notEqual(f.state.requests[1].key, 'legacy');
  assert.equal('expires_at' in f.state.requests[1].params, false);
  assert.equal(Object.keys(f.state.sessions).length, 1);
  await f.checkout(); assert.equal(f.state.requests.length, 2);
});
test('old ambiguous attempts require reconciliation instead of new payments', async () => {
  const f = await fixture();
  Object.assign(f.state.customer, { checkoutKey: 'legacy', checkoutParams: { expires_at: 123 }, checkoutStartedAt: new Date(Date.now() - 24 * 3600000) });
  await assert.rejects(f.checkout(), /reconciliation/);
  assert.equal(f.state.requests.length, 0);
});
test('billing diagnostics omit raw messages, credentials and customer data', () => {
  const logs = [];
  runtime.logBillingFailure({ type: 'StripeInvalidRequestError', statusCode: 400, param: 'expires_at', requestId: 'req_fixture', message: 'secret email@example.com', raw: { key: 'sk_live_secret' } }, 'checkout', (...args) => logs.push(args));
  const output = JSON.stringify(logs);
  assert.match(output, /expires_at/); assert.match(output, /req_fixture/);
  assert.doesNotMatch(output, /secret|email@|raw/);
  assert.doesNotThrow(() => runtime.logBillingFailure({}, 'checkout', () => { throw Error('log failed'); }));
});
test('network interruption replays the same checkout key and exact saved parameters', async () => {
  const f = await fixture(); f.state.failAfterCreate = true;
  await assert.rejects(f.checkout()); await f.checkout();
  assert.equal(f.state.requests.length, 2);
  assert.equal(f.state.requests[0].key, f.state.requests[1].key);
  assert.deepEqual(f.state.requests[0].params, f.state.requests[1].params);
  assert.equal(Object.keys(f.state.sessions).length, 1);
});
test('changing billing period expires the previous open checkout', async () => {
  const f = await fixture(); await f.checkout(); await f.checkout('gbpAnnual');
  assert.equal(f.state.expireCount, 1); assert.equal(f.state.requests.length, 2);
  assert.equal(f.state.requests[1].params.line_items[0].price, 'price_gbpAnnual');
});
test('stale pricing, active subscriptions and concurrent checkout locks fail closed', async () => {
  const f = await fixture(); await assert.rejects(f.checkout('gbpMonthly', 2));
  f.state.subscriptions = [{ id: 'sub_existing', status: 'active' }]; await assert.rejects(f.checkout());
  f.state.subscriptions = []; f.state.customer.lockUntil = new Date(Date.now() + 60000); await assert.rejects(f.checkout());
  assert.equal(f.state.requests.length, 0);
});
test('recovered checkout rejects wrong customer and live-mode sessions', async () => {
  for (const change of [{ customer: 'cus_other' }, { livemode: true }]) {
    const f = await fixture(); await f.checkout(); Object.assign(Object.values(f.state.sessions)[0], change);
    await assert.rejects(f.checkout(), /BILLING_BINDING_MISMATCH/);
    assert.equal(f.state.requests.length, 1);
  }
});
test('ended subscriptions can rejoin but unverified completed checkout cannot start again', async () => {
  const f = await fixture(); await f.checkout();
  const session = Object.values(f.state.sessions)[0]; session.status = 'complete'; session.subscription = 'sub_old';
  await assert.rejects(f.checkout(), /being verified/);
  f.state.subscriptions = [{ id: 'sub_old', status: 'canceled' }]; await f.checkout();
  assert.equal(f.state.requests.length, 2);
});

test('VAT creates a verified exclusive rate, attaches it to checkout, and reuses it', async () => {
  const f = await fixture(); f.state.tax = { enabled: true, basisPoints: 2000, revision: 1 };
  await f.checkout();
  assert.equal(f.state.taxRates[0].percentage, 20); assert.equal(f.state.taxRates[0].inclusive, false);
  assert.equal(f.state.requests[0].params.line_items[0].tax_rates[0], 'txr_0');
  await f.checkout('gbpAnnual'); assert.equal(f.state.taxRates.length, 1);
});
test('VAT revisions reject stale pages and replace old open sessions without repricing subscriptions', async () => {
  const f = await fixture(); await f.checkout();
  assert.equal(f.state.requests[0].params.line_items[0].tax_rates, undefined);
  f.state.tax = { enabled: true, basisPoints: 1750, revision: 1 };
  await assert.rejects(f.checkout('gbpMonthly', 1, 0), /VAT settings changed/);
  await f.checkout(); assert.equal(f.state.expireCount, 1); assert.equal(f.state.taxRates[0].percentage, 17.5);
  f.state.tax = { ...f.state.tax, enabled: false, revision: 2 }; await f.checkout();
  assert.equal(f.state.requests.at(-1).params.line_items[0].tax_rates, undefined);
  assert.equal(f.state.expireCount, 2);
});
test('VAT provider failure blocks checkout instead of silently omitting tax', async () => {
  const f = await fixture(); f.state.tax = { enabled: true, basisPoints: 2000, revision: 1 }; f.state.taxFailure = true;
  await assert.rejects(f.checkout(), /permission denied/); assert.equal(f.state.requests.length, 0);
});
