import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import * as security from "../lib/security.mjs";
import * as policy from "../lib/billing-policy.mjs";
import * as runtime from "../lib/billing-runtime.mjs";

async function fixture({ locked = false, invoicePaid = true, wrongCustomer = false, live = false, receiptFails = false, status = "active" } = {}) {
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
  const price = { id: "price_test", product: "product_test", unit_amount: 900, currency: "gbp", recurring: { interval: "month", interval_count: 1 } };
  const state = { customer: { id: "binding", stripeCustomerId: "cus_owner", accountId: "owner", mode: "test", lockToken: locked ? "another" : null, lockUntil: locked ? new Date(Date.now() + 60000) : null }, events: {}, records: {}, retrievals: 0,
    sub: { id: "sub_test", customer: wrongCustomer ? "cus_someone_else" : "cus_owner", livemode: live, status, cancel_at_period_end: false, latest_invoice: { status: invoicePaid ? "paid" : "open" }, items: { data: [{ price, quantity: 1, current_period_end: periodEnd }], has_more: false } } };
  const client = {
    billingHistory: { create: async ({data}) => { (state.history ??= []).push(data); } },
    billingCustomer: {
      findUnique: async ({ where }) => where.mode_stripeCustomerId?.stripeCustomerId === state.customer.stripeCustomerId ? { ...state.customer } : null,
      findUniqueOrThrow: async () => ({ ...state.customer }),
      updateMany: async ({ where, data }) => {
        if (where.OR && state.customer.lockUntil && state.customer.lockUntil > new Date()) return { count: 0 };
        if (where.lockToken && where.lockToken !== state.customer.lockToken) return { count: 0 };
        if (where.lockUntil?.gt && state.customer.lockUntil <= where.lockUntil.gt) return { count: 0 };
        Object.assign(state.customer, data); return { count: 1 };
      },
    },
    billingPrice: { findUnique: async () => ({ amount: 900, currency: "gbp", interval: "month", stripeProductId: "product_test" }) },
    billingSubscription: { findUnique: async ({ where }) => state.records[where.id] || null, upsert: async ({ where, create, update }) => { state.records[where.id] = state.records[where.id] ? { ...state.records[where.id], ...update } : create; } },
    billingEvent: { findUnique: async ({ where }) => state.events[where.id] || null, create: async ({ data }) => { if (receiptFails) throw Error("receipt failed"); if (state.events[data.id]) throw Error("duplicate"); state.events[data.id] = data; } },
  };
  client.$transaction = async fn => { const before = structuredClone({ records: state.records, events: state.events, history: state.history ?? [] }); try { return await fn(client); } catch (e) { state.records = before.records; state.events = before.events; state.history = before.history; throw e; } };
  const modules = {
    "server-only": {}, "node:crypto": { randomUUID: () => "lock_fixture" }, "@/generated/prisma": {},
    "./db": { db: () => client }, "./security.mjs": security, "./billing-policy.mjs": policy,
    "./billing-runtime.mjs": { ...runtime, billingEnvironment: () => ({ mode: "test" }) },
    "./email-config.mjs": {}, "./billing-pricing": {},
    "./stripe": { stripeClient: () => ({ subscriptions: { retrieve: async () => { state.retrievals++; return structuredClone(state.sub); } } }) },
  };
  const exports = {};
  const code = ts.transpileModule(await readFile("lib/billing.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => { if (!modules[name]) throw Error(`Unexpected ${name}`); return modules[name]; }, Date, process: { env: {} } });
  return { state, sync: (id = "evt_fixture") => exports.syncSubscription("binding", "sub_test", { id, type: "customer.subscription.updated" }), handle: exports.handleBillingEvent };
}

test("subscription sync is idempotent and reads latest provider state instead of event snapshots", async () => {
  const f = await fixture();
  await f.sync();
  assert.equal(f.state.records["test:sub_test"].recognized, true);
  assert.equal(runtime.hasPaidPro(f.state.records["test:sub_test"]), true);
  await f.sync();
  assert.equal(f.state.retrievals, 1);
  assert.equal(f.state.history.length, 1);
  assert.equal(f.state.history[0].customerId, 'binding');
  assert.equal(f.state.history[0].mode, 'test');
  assert.equal(f.state.history[0].summary.kind, 'verified_subscription_snapshot');
  assert.equal(f.state.history[0].amountPaid, undefined);
  f.state.sub.status = "canceled";
  await f.sync("evt_delayed_old_event");
  assert.equal(runtime.hasPaidPro(f.state.records["test:sub_test"]), false);
  assert.equal(Object.keys(f.state.events).length, 2);
});

test("unpaid subscriptions never get a new paid period; failed renewals do not extend one", async () => {
  const f = await fixture({ invoicePaid: false });
  await f.sync();
  assert.equal(f.state.records["test:sub_test"].paidThrough, null);
  f.state.sub.latest_invoice.status = "paid";
  await f.sync("evt_paid");
  const end = f.state.records["test:sub_test"].paidThrough.getTime();
  f.state.sub.latest_invoice.status = "open";
  f.state.sub.status = "past_due";
  f.state.sub.items.data[0].current_period_end += 30 * 86400;
  await f.sync("evt_failed_renewal");
  assert.equal(f.state.records["test:sub_test"].paidThrough.getTime(), end);
});

test("billing rejects cross-customer data, live provider state and concurrent sync", async () => {
  for (const options of [{ wrongCustomer: true }, { live: true }, { locked: true }]) {
    const f = await fixture(options);
    await assert.rejects(f.sync());
    assert.equal(Object.keys(f.state.records).length, 0);
    assert.equal(Object.keys(f.state.events).length, 0);
  }
});

test("receipt and subscription updates are atomic and release the customer lock on failure", async () => {
  const f = await fixture({ receiptFails: true });
  await assert.rejects(f.sync());
  assert.equal(Object.keys(f.state.records).length, 0);
  assert.equal(Object.keys(f.state.events).length, 0);
  assert.equal(f.state.customer.lockToken, null);
  assert.equal(f.state.history.length, 0);
});

test("webhook routing ignores unrelated customers and never trusts account metadata", async () => {
  const f = await fixture();
  await f.handle({ id: "evt_other", livemode: false, type: "customer.subscription.updated", data: { object: { id: "sub_other", customer: "cus_other", metadata: { accountId: "owner" } } } });
  assert.equal(f.state.retrievals, 0);
  await f.handle({ id: "evt_owner", livemode: false, type: "customer.subscription.updated", data: { object: { id: "sub_test", customer: "cus_owner" } } });
  assert.equal(f.state.retrievals, 1);
  await assert.rejects(f.handle({ id: "evt_live", livemode: true, type: "customer.subscription.updated", data: { object: {} } }));
});
