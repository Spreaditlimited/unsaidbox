import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
const exports = {};
const h = React.createElement;
vm.runInNewContext(ts.transpileModule(await readFile('app/page.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => {
  if (name === 'react/jsx-runtime') return jsx;
  if (name === 'next/link') return { default: ({ children, ...props }) => h('a', props, children) };
  if (name === '@/components/SiteShell') return { SiteShell: ({ children }) => h('main', null, children) };
  if (name === '@/components/Brand') return { Arrow: () => h('span', null, '→'), Mark: () => h('svg', { 'data-brand': 'UnsaidBox' }) };
  if (name === '@/components/ui/Icon') return { Icon: () => h('svg') };
  if (name === '@/lib/social-metadata') return { socialMetadata: x => ({ openGraph: x, twitter: x }) };
  if (name === './home.module.css') return { default: new Proxy({}, { get: (_, key) => key }) };
  throw Error(name);
} });
const html = renderToStaticMarkup(h(exports.default));
test('homepage has a descriptive canonical, metadata and one visible primary heading', () => {
  assert.match(exports.metadata.title.absolute, /Anonymous Questions/);
  assert.equal(exports.metadata.alternates.canonical, 'https://unsaidbox.com/');
  assert.equal(exports.metadata.robots.index, true);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /Honest answers/);
});
test('homepage comparison never names or links competitors; CTAs stay inside the product', () => {
  assert.match(html, /Other tools/);
  assert.doesNotMatch(html, /tellonym|suggestion\s?ox|slido|ngl\.link/i);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(hrefs.every(href => href.startsWith('/') || href.startsWith('#')));
  assert.ok(hrefs.filter(href => href === '/start').length >= 3);
  assert.ok(hrefs.includes('/pricing'));
});
test('FAQ structured data exactly matches visible questions and avoids invented ratings', () => {
  const schema = JSON.parse(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  const faq = schema['@graph'].find(v => v['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity.length, 7);
  for (const item of faq.mainEntity) assert.ok(html.includes(item.acceptedAnswer.text));
  assert.doesNotMatch(JSON.stringify(schema), /aggregateRating|reviewCount/);
});
