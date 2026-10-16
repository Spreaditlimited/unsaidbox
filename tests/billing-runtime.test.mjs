import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import Stripe from "stripe";
import { billingEnvironment, assertCheckoutPrice, hasPaidPro, stripeRedirect } from "../lib/billing-runtime.mjs";

test("billing is disabled by default, rejects live keys and never falls back to them", () => {
  for (const env of [{}, { UNSAID_BILLING_MODE: "live" }, { UNSAID_BILLING_MODE: "test", UNSAID_STRIPE_SECRET_KEY: "rk_live_fixture" }, { UNSAID_BILLING_MODE: "test", UNSAID_STRIPE_TEST_SECRET_KEY: "sk_live_fixture" }, { UNSAID_BILLING_MODE: "test", UNSAID_STRIPE_TEST_SECRET_KEY: "sk_test_fixture", VERCEL_ENV: "production" }]) assert.throws(() => billingEnvironment(env));
  for (const prefix of ["sk", "rk"]) assert.equal(billingEnvironment({ UNSAID_BILLING_MODE: "test", UNSAID_STRIPE_TEST_SECRET_KEY: `${prefix}_test_fixture` }).mode, "test");
});

function priceFixture() {
  return { price: { id: "price_fixture", product: { id: "prod_fixture", active: true }, livemode: false, active: true, type: "recurring", unit_amount: 900, currency: "gbp", recurring: { interval: "month", interval_count: 1, usage_type: "licensed" }, billing_scheme: "per_unit" }, mapping: { mode: "test", stripePriceId: "price_fixture", stripeProductId: "prod_fixture", amount: 900, currency: "gbp", interval: "month" } };
}
test("checkout validates provider amount, currency, interval, product and environment", () => {
  const { price, mapping } = priceFixture();
  assert.doesNotThrow(() => assertCheckoutPrice(price, mapping, 900));
  for (const invalid of [{ livemode: true }, { active: false }, { unit_amount: 1200 }, { currency: "usd" }, { product: { id: "other", active: true } }, { product: { id: "prod_fixture", active: false } }, { recurring: { interval: "year", interval_count: 1 } }, { recurring: { interval: "month", interval_count: 2 } }, { type: "one_time" }, { billing_scheme: "tiered" }]) assert.throws(() => assertCheckoutPrice({ ...price, ...invalid }, mapping, 900));
  assert.throws(() => assertCheckoutPrice(price, mapping, 1000));
});

test("only recognized paid periods confer Pro; return URLs and unpaid states do not", () => {
  const now = new Date("2026-10-07T12:00:00Z");
  const sub = { recognized: true, status: "active", paidThrough: new Date("2026-11-07T12:00:00Z") };
  assert.equal(hasPaidPro(sub, now), true);
  assert.equal(hasPaidPro({ ...sub, cancelAtPeriodEnd: true }, now), true);
  for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused", "trialing"]) assert.equal(hasPaidPro({ ...sub, status }, now), false);
  assert.equal(hasPaidPro({ ...sub, paidThrough: now }, now), false);
  assert.equal(hasPaidPro({ ...sub, paidThrough: null }, now), false);
  assert.equal(hasPaidPro({ ...sub, recognized: false }, now), false);
});

test("billing redirects only to the intended Stripe hosts", () => {
  assert.equal(stripeRedirect("https://checkout.stripe.com/c/pay/test", "checkout"), "https://checkout.stripe.com/c/pay/test");
  for (const value of ["http://checkout.stripe.com/test", "https://checkout.stripe.com.evil.test/", "https://evil.test/", "https://user@checkout.stripe.com/", "javascript:alert(1)"]) assert.throws(() => stripeRedirect(value, "checkout"));
});

async function webhookFixture({ fails = false } = {}) {
  const stripe = new Stripe("sk_test_fixture");
  const secret = "whsec_test_fixture_not_a_real_secret";
  const calls = [];
  const exports = {};
  const modules = { "@/lib/billing-runtime.mjs": { billingWebhookSecret: env => env.UNSAID_STRIPE_TEST_WEBHOOK_SECRET }, "@/lib/stripe": { stripeClient: () => stripe }, "@/lib/billing": { handleBillingEvent: async event => { if (fails) throw Error("database unavailable"); calls.push(event.id); } } };
  const code = ts.transpileModule(await readFile("app/api/billing/stripe/webhook/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => modules[name], Buffer, Response, process: { env: { UNSAID_STRIPE_TEST_WEBHOOK_SECRET: secret } }, console: { error() {} } });
  return { calls, post: async ({ live = false, signature = true, timestamp, payload: supplied } = {}) => {
    const payload = supplied || JSON.stringify({ id: "evt_fixture", type: "invoice.paid", livemode: live, data: { object: {} } });
    const signed = stripe.webhooks.generateTestHeaderString({ payload, secret, ...(timestamp ? { timestamp } : {}) });
    return exports.POST(new Request("http://localhost/webhook", { method: "POST", body: payload, headers: signature ? { "stripe-signature": signed } : {} }));
  } };
}

test("webhook verifies signatures, rejects old signatures and live events, bounds payloads", async () => {
  const fixture = await webhookFixture();
  assert.equal((await fixture.post({ signature: false })).status, 400);
  assert.equal((await fixture.post({ timestamp: 1 })).status, 400);
  assert.equal((await fixture.post({ live: true })).status, 400);
  assert.equal((await fixture.post({ payload: "x".repeat(1024 * 1024 + 1) })).status, 413);
  assert.equal(fixture.calls.length, 0);
  assert.equal((await fixture.post()).status, 200);
  assert.deepEqual(fixture.calls, ["evt_fixture"]);
});

test("webhook processing failure returns retryable 503, never a false acknowledgement", async () => {
  const fixture = await webhookFixture({ fails: true });
  assert.equal((await fixture.post()).status, 503);
});

test("billing actions authenticate and verify CAPTCHA before invoking services", async () => {
  const { InputError } = await import("../lib/security.mjs");
  const { pricingRevision } = await import("../lib/billing-policy.mjs");
  const code = ts.transpileModule(await readFile("app/dashboard/billing/actions.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const deniedAt of ["auth", "captcha"]) {
    const exports = {};
    let called = false;
    const forbidden = () => { called = true; throw Error("unexpected access"); };
    const modules = {
      "next/navigation": { redirect: forbidden, unstable_rethrow(e) { if (e.message.startsWith("redirect:")) throw e; } },
      "next/cache": { revalidatePath: forbidden },
      "@/lib/auth": { requireAccount: async () => { if (deniedAt === "auth") throw Error("redirect:/login"); return { id: "owner" }; }, rateLimit: forbidden },
      "@/lib/captcha.mjs": { verifyCaptcha: async () => { throw new InputError("CAPTCHA rejected"); } },
      "@/lib/security.mjs": { InputError }, "@/lib/billing-policy.mjs": { pricingRevision },
      "@/lib/billing": { beginCheckout: forbidden, beginPortal: forbidden, syncSubscription: forbidden },
      "@/lib/billing-runtime.mjs": { billingEnvironment: forbidden }, "@/lib/stripe": { stripeClient: forbidden }, "@/lib/db": { db: forbidden },
    };
    vm.runInNewContext(code, { exports, require: name => modules[name] });
    for (const action of ["startCheckout", "openBillingPortal", "refreshBilling"]) {
      if (deniedAt === "auth") await assert.rejects(exports[action]({}, new FormData()), /redirect:/);
      else assert.match((await exports[action]({}, new FormData())).error, /CAPTCHA/);
    }
    assert.equal(called, false);
  }
});
