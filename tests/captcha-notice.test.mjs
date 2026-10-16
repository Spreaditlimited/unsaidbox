import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

const exports = {};
vm.runInNewContext(ts.transpileModule(await readFile('components/Captcha.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: name => {
  if (name === 'react') return React;
  if (name === 'react/jsx-runtime') return jsx;
  throw Error(`Unexpected dependency: ${name}`);
} });
const { CaptchaProvider, CaptchaNoticeGroup, Captcha } = exports;
const h = React.createElement;
const notices = html => (html.match(/class="captcha-notice fine"/g) || []).length;

test('production-enabled auth forms share exactly one notice after all sign-in controls', () => {
  const html = renderToStaticMarkup(h(CaptchaProvider, { config: { enabled: true, siteKey: 'test' } },
    h(CaptchaNoticeGroup, null, ['Google', 'Apple', 'Email'].map(name => h('form', { key: name }, h(Captcha), h('button', null, name))))));
  assert.equal(notices(html), 1);
  assert.ok(html.indexOf('captcha-notice') > html.lastIndexOf('</form>'));
  assert.match(html, /https:\/\/policies.google.com\/privacy/);
  assert.match(html, /https:\/\/policies.google.com\/terms/);
});
test('standalone forms retain notices and disabled local CAPTCHA still has none', () => {
  for (const enabled of [true, false]) {
    const standalone = renderToStaticMarkup(h(CaptchaProvider, { config: { enabled, siteKey: 'test' } }, h(Captcha)));
    assert.equal(notices(standalone), enabled ? 1 : 0);
  }
  const local = renderToStaticMarkup(h(CaptchaProvider, { config: { enabled: false, siteKey: '' } }, h(CaptchaNoticeGroup, null, h(Captcha))));
  assert.equal(notices(local), 0);
});
test('shared auth shell groups notices without changing form CAPTCHA execution', async () => {
  assert.match(await readFile('components/AuthShell.tsx', 'utf8'), /<CaptchaNoticeGroup>\{children\}<\/CaptchaNoticeGroup>/);
  assert.match(await readFile('components/ActionForm.tsx', 'utf8'), /await secure\(data, captchaAction\)/);
  for (const provider of ['google', 'apple']) {
    const action = await readFile(`app/auth/${provider}/actions.ts`, 'utf8');
    assert.ok(action.includes(`verifyCaptcha(form, '${provider}SignIn')`));
  }
});
