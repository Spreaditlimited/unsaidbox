import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

test('terms page identifies the operator, preserves consumer rights and has public metadata', async () => {
  const source = await readFile(new URL('../app/terms/page.tsx', import.meta.url), 'utf8');
  const context = { exports: {}, require(name) {
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'next/link') return { default: props => jsx.jsx('a', props) };
    if (name === '@/components/SiteShell') return { SiteShell: ({ children }) => jsx.jsx('main', { children }) };
    throw Error(`Unexpected dependency: ${name}`);
  } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  const html = renderToStaticMarkup(jsx.jsx(context.exports.default, {}));
  assert.equal(context.exports.metadata.alternates.canonical, 'https://unsaidbox.com/terms');
  assert.equal(context.exports.metadata.robots.index, true);
  assert.match(html, /Tochukwu Tech and AI Academy Limited/);
  assert.match(html, /17291472/);
  assert.match(html, /WA4 6AA/);
  assert.match(html, /18 or over/);
  assert.match(html, /private-only/);
  assert.match(html, /Nothing takes away mandatory consumer rights/);
  assert.match(html, /mailto:hello@unsaidbox.com/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.equal((html.match(/<h2>/g) || []).length, 13);
  assert.doesNotMatch(html, /href="\/pricing"|Stripe|Paystack|£9|AI question/);
});
