import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as presentation from '../lib/billing-presentation.mjs';
import * as policy from '../lib/billing-policy.mjs';
import * as planPolicy from '../lib/plan-policy.mjs';

async function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, Date, process: { env: { UNSAID_STRIPE_TEST_WEBHOOK_SECRET: 'whsec_fixture' } }, require: name => {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return jsx;
    if (name === './billing.module.css') return { default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (!modules[name]) throw Error(`Unexpected import ${name}`);
    return modules[name];
  } });
  return exports;
}
const actionForm = { ActionForm: ({ children, label }) => jsx.jsxs('form', { children: [children, jsx.jsx('button', { children: label })] }) };
const actions = { startCheckout() {}, openBillingPortal() {}, refreshBilling() {} };

test('browser price helper has no server module dependencies', async () => {
  const display = await readFile('lib/billing-display.mjs', 'utf8');
  assert.doesNotMatch(display, /^\s*import\s/m);
  const selector = await readFile('app/dashboard/billing/PlanSelector.tsx', 'utf8');
  assert.match(selector, /from "@\/lib\/billing-display.mjs"/);
  assert.doesNotMatch(selector, /from "@\/lib\/(billing-runtime|billing-presentation|billing-policy|security)/);
});

test('Pro selector renders real configured prices, labelled choices and exact checkout fields', async () => {
  const { PlanSelector } = await load('app/dashboard/billing/PlanSelector.tsx', { '@/lib/plan-policy.mjs': planPolicy, '@/components/ActionForm': actionForm, '@/lib/billing-display.mjs': presentation, './actions': actions });
  const props = { prices: policy.defaultPricing(), revision: 7, availableKeys: ['gbpMonthly'], canCheckout: true, hasSubscription: false };
  const html = renderToStaticMarkup(jsx.jsx(PlanSelector, props));
  assert.match(html, /£9.00/); assert.match(html, /name="priceKey" value="gbpMonthly"/);
  assert.match(html, /name="revision" value="7"/); assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-labelledby="billing-currency-label"/);
  assert.match(html, /aria-live="polite"/);
  const live = renderToStaticMarkup(jsx.jsx(PlanSelector, { ...props, testMode: false }));
  assert.doesNotMatch(live, /sandbox|test checkout|test payments|test card/i);
  const taxed = renderToStaticMarkup(jsx.jsx(PlanSelector, { ...props, tax: { enabled: true, basisPoints: 2000, revision: 3 } }));
  assert.match(taxed, /£10.80/); assert.match(taxed, /20% VAT/); assert.match(taxed, /name="taxRevision" value="3"/);
  const blocked = renderToStaticMarkup(jsx.jsx(PlanSelector, { ...props, canCheckout: false, hasSubscription: true }));
  assert.doesNotMatch(blocked, /<form/); assert.match(blocked, /already have a subscription/);
});

test('billing server page renders owner-scoped data and handles unavailable billing tables', async () => {
  for (const unavailable of [false, true]) {
    let lookup;
    const { default: Page } = await load('app/dashboard/billing/page.tsx', {
      '@/lib/auth': { requireAccount: async () => ({ id: 'fixture-owner', displayName: 'Fixture' }) },
      '@/lib/db': { db: () => ({ billingCustomer: { findUnique: async ({ where }) => { lookup = where; if (unavailable) throw Error('database unavailable'); return null; } }, billingPrice: { findMany: async () => [{ priceKey: 'gbpMonthly', amount: 900 }] } }) },
      '@/lib/billing-pricing': { getBillingPricing: async () => ({ prices: policy.defaultPricing(), revision: 1 }) },
      '@/lib/billing-runtime.mjs': { billingEnvironment: () => ({ mode: 'test' }), billingWebhookSecret: () => 'whsec_fixture' },
      '@/lib/billing-presentation.mjs': presentation,
      '@/lib/plans': { accountPlan: async () => ({ key: 'free', enforced: false }), usageSummary: async () => ({ used: 25, limit: 500, level: 'normal', plan: 'free', resetsAt: new Date('2026-11-01T00:00:00Z') }) },
      '@/lib/plan-policy.mjs': planPolicy,
      '@/lib/plan-configuration': { getPlanConfiguration: async () => ({ plans: planPolicy.plans }) },
      './ProTools': { ProTools: () => null },
      '@/components/DashboardShell': { DashboardShell: ({ children }) => jsx.jsx('main', { children }) },
      '@/components/ActionForm': actionForm, './actions': actions,
      './PlanSelector': { PlanSelector: ({ canCheckout }) => jsx.jsx('div', { children: canCheckout ? 'Checkout enabled' : 'Checkout disabled' }) },
    });
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    assert.equal(lookup.accountId_mode.accountId, 'fixture-owner'); assert.equal(lookup.accountId_mode.mode, 'test');
    assert.match(html, /Plan &amp; billing/);
    assert.match(html, /1 November 2026/);
    assert.match(html, /<caption>Active links by plan<\/caption>/);
    assert.match(html, /Current plan/);
    assert.match(html, /Downgrading never deletes your content/);
    assert.match(html, unavailable ? /Status unavailable/ : /No paid subscription/);
    assert.match(html, unavailable ? /Checkout disabled/ : /Checkout enabled/);
  }
});
