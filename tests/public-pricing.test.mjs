import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as display from '../lib/billing-display.mjs';
import * as plans from '../lib/plan-policy.mjs';
import { analyticsPage } from '../lib/analytics-policy.mjs';

async function load(file, extra = {}, selection = ['GBP', 'month']) {
  let hook = 0;
  const exports = {};
  const modules = {
    react: { ...React, useState: () => [selection[hook++], () => {}] },
    'react/jsx-runtime': jsx, 'next/link': { default: props => jsx.jsx('a', props) },
    './pricing.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
    '@/lib/billing-display.mjs': display, '@/lib/plan-policy.mjs': plans, ...extra,
  };
  vm.runInNewContext(ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => { if (!(name in modules)) throw Error(`Unexpected import ${name}`); return modules[name]; } });
  return exports;
}
const prices = { gbpMonthly: 900, gbpAnnual: 9000, usdMonthly: 1200, usdAnnual: 12000 };
test('public pricing renders administrator allowances rather than built-in defaults', async () => {
  const { PricingCards } = await load('app/pricing/PricingCards.tsx');
  const configured = { free: { ...plans.plans.free, submissions: 777, questions: 7, forms: 6 }, pro: { ...plans.plans.pro, submissions: 8888, questions: 80, forms: 70 } };
  const html = renderToStaticMarkup(jsx.jsx(PricingCards, { prices, plans: configured }));
  assert.match(html, /777/); assert.match(html, /8,888/);
  assert.match(html, /<strong>80<\/strong> active questions/);
  assert.match(html, /<strong>70<\/strong> active feedback forms/);
});
test('public cards use configured prices across all currency/period choices without enabling checkout', async () => {
  for (const [currency, period, amount] of [['GBP', 'month', '£9.00'], ['GBP', 'year', '£90.00'], ['USD', 'month', '$12.00'], ['USD', 'year', '$120.00']]) {
    const { PricingCards } = await load('app/pricing/PricingCards.tsx', {}, [currency, period]);
    const html = renderToStaticMarkup(jsx.jsx(PricingCards, { prices }));
    assert.ok(html.includes(amount)); assert.match(html, /aria-pressed="true"/);
    assert.match(html, /aria-live="polite"/); assert.match(html, /href="\/start"/);
    assert.match(html, /href="\/dashboard\/billing#upgrade-pro"/);
    assert.match(html, /5,000/); assert.doesNotMatch(html, /href="[^\"]*(checkout|stripe)/);
    if (period === 'year') assert.match(html, /less than 12 monthly payments/);
  }
});
test('missing prices do not hide free signup or silently substitute defaults', async () => {
  const { PricingCards } = await load('app/pricing/PricingCards.tsx');
  const html = renderToStaticMarkup(jsx.jsx(PricingCards, { prices: null }));
  assert.match(html, /Price unavailable/); assert.match(html, /Create your free box/); assert.doesNotMatch(html, /£9.00/);
});
test('public VAT preview states exclusive pricing and the full total', async () => {
  const { PricingCards } = await load('app/pricing/PricingCards.tsx');
  const html = renderToStaticMarkup(jsx.jsx(PricingCards, { prices, tax: { enabled: true, basisPoints: 2000 } }));
  assert.match(html, /Plan prices exclude VAT/); assert.match(html, /20% VAT: £1.80 · Total: £10.80/);
});
test('public page handles database failure and publishes correct indexing metadata', async () => {
  for (const failed of [false, true]) {
    let received;
    const { default: Page, metadata } = await load('app/pricing/page.tsx', {
      '@/components/SiteShell': { SiteShell: ({ children }) => jsx.jsx('main', { children }) },
      '@/lib/billing-pricing': { getBillingPricing: async () => { if (failed) throw Error('private connection'); return { prices }; } },
      '@/lib/social-metadata': { socialMetadata: value => ({ openGraph: value }) },
      '@/lib/plan-configuration': { getPlanConfiguration: async () => ({ plans: (await import('../lib/plan-policy.mjs')).plans }) },
      './PricingCards': { PricingCards: props => { received = props.prices; return null; } },
    });
    const html = renderToStaticMarkup(await Page());
    assert.equal(received, failed ? null : prices); assert.match(html, /Nothing|Never/);
    assert.doesNotMatch(html, /private connection/);
    assert.equal(metadata.robots.index, true); assert.equal(metadata.alternates.canonical, 'https://unsaidbox.com/pricing');
    assert.equal(metadata.openGraph.url, 'https://unsaidbox.com/pricing');
  }
});
test('pricing is discoverable and analytics remains limited to the public page', async () => {
  for (const file of ['components/PublicHeader.tsx', 'components/SiteShell.tsx']) assert.match(await readFile(file, 'utf8'), /href="\/pricing"/);
  assert.equal(analyticsPage('/pricing'), 'Pricing'); assert.equal(analyticsPage('/dashboard/billing'), null);
});
