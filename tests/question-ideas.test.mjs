import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as policy from '../lib/question-ideas-policy.mjs';
import { InputError } from '../lib/security.mjs';
import { plans } from '../lib/plan-policy.mjs';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

const ideas = Array.from({ length: 5 }, (_, i) => `What would make learning topic ${i + 1} easier for you?`);
function form(changes = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ niche: 'AI for small businesses', audience: 'Beginners', goal: policy.ideaGoals[0], tone: policy.ideaTones[0], ...changes })) data.set(key, value);
  return data;
}
async function load(file, modules, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, ...extra, require(name) { if (!(name in modules)) throw Error(`Unexpected import ${name}`); return modules[name]; } });
  return exports;
}
test('AI access is Pro-only and input fields are bounded and allowlisted', () => {
  assert.equal(plans.free.aiQuestions, false); assert.equal(plans.pro.aiQuestions, true);
  assert.equal(policy.ideaInput(form()).niche, 'AI for small businesses');
  for (const changes of [{ niche: 'x' }, { niche: 'a'.repeat(161) }, { audience: 'a'.repeat(241) }, { goal: 'override' }, { tone: 'override' }]) assert.throws(() => policy.ideaInput(form(changes)));
});
test('model responses require five distinct plain-text questions', () => {
  assert.deepEqual(policy.validateIdeas({ questions: ideas }).questions, ideas);
  for (const value of [null, {}, { questions: ideas.slice(0, 4) }, { questions: [...ideas, 'Another question?'] }, { questions: Array(5).fill('Same question repeated?') }, { questions: ['<script>alert(1)</script>', ...ideas.slice(1)] }, { questions: [55, ...ideas.slice(1)] }]) assert.throws(() => policy.validateIdeas(value));
});
async function fixture({ pro = true, auth = true, captcha = true, ready = true, failure = false, limited = false } = {}) {
  const state = { providerCalls: 0, budgets: [], input: null };
  const actions = await load('app/dashboard/questions/new/ideas-actions.ts', {
    'next/navigation': { unstable_rethrow(e) { if (e.message === 'redirect:/login') throw e; } },
    '@/lib/auth': { requireAccount: async () => { if (!auth) throw Error('redirect:/login'); return { id: 'verified-owner' }; }, rateLimit: async (...args) => { state.budgets.push(args); if (limited) throw new InputError('Too many attempts'); } },
    '@/lib/plans': { requirePlanFeature: async (id, feature) => { assert.equal(id, 'verified-owner'); assert.equal(feature, 'aiQuestions'); if (!pro) throw new InputError('Pro required'); } },
    '@/lib/captcha.mjs': { verifyCaptcha: async (_, action) => { assert.equal(action, 'suggestQuestions'); if (!captcha) throw new InputError('CAPTCHA rejected'); } },
    '@/lib/security.mjs': { InputError }, '@/lib/question-ideas-policy.mjs': policy,
    '@/lib/question-ideas': { questionAIReady: () => ready, generateQuestionIdeas: async input => { state.providerCalls++; state.input = input; if (failure) throw Error('secret provider payload'); return ideas; } },
  });
  return { state, suggest: data => actions.suggestQuestions(data) };
}
test('unauthenticated, Free, missing-key and CAPTCHA-failed requests never reach OpenAI', async () => {
  const loggedOut = await fixture({ auth: false }); await assert.rejects(loggedOut.suggest(form()), /redirect/);
  for (const options of [{ pro: false }, { captcha: false }, { ready: false }, { limited: true }]) {
    const f = await fixture(options); assert.ok((await f.suggest(form())).error); assert.equal(f.state.providerCalls, 0);
  }
});
test('generation only sends selected inputs; quota uses authenticated owner and no question is persisted', async () => {
  const f = await fixture(); const result = await f.suggest(form({ accountId: 'victim', inbox: 'private data' }));
  assert.deepEqual(result.questions, ideas); assert.equal(f.state.providerCalls, 1);
  assert.deepEqual(Object.keys(f.state.input).sort(), ['audience', 'goal', 'niche', 'tone']);
  assert.equal(f.state.budgets.length, 4); assert.equal(f.state.budgets[2][1], 50);
  assert.ok(f.state.budgets[0][0].includes('verified-owner'));
});
test('provider failures return a safe error without secret details', async () => {
  const f = await fixture({ failure: true }); const result = await f.suggest(form());
  assert.match(result.error, /draft is unchanged/); assert.doesNotMatch(result.error, /secret provider/);
});
test('provider request disables storage and retries, bounds time/tokens, and validates output', async () => {
  let request;
  const api = await load('lib/question-ideas.ts', {
    'server-only': {}, './question-ideas-policy.mjs': policy,
    ai: { generateText: async args => { request = args; return { output: { questions: ideas } }; }, Output: { object: value => value }, jsonSchema: (schema, options) => ({ schema, options }) },
    '@ai-sdk/openai': { createOpenAI: () => ({ responses: model => model }) },
  }, { process: { env: { UNSAIDBOX_OPENAI_API_KEY: 'test-fixture-not-a-key' } }, AbortSignal });
  assert.deepEqual(await api.generateQuestionIdeas(policy.ideaInput(form())), ideas);
  assert.equal(request.providerOptions.openai.store, false); assert.equal(request.maxRetries, 0);
  assert.equal(request.maxOutputTokens, 1800); assert.ok(request.abortSignal instanceof AbortSignal);
  assert.equal(request.tools, undefined); assert.equal(request.output.schema.options.validate({ questions: ideas }).success, true);
  assert.equal(request.output.schema.options.validate({ questions: [] }).success, false);
});

test('composer preserves manual questions for Free and unavailable AI, and exposes labelled Pro controls', async () => {
  const { QuestionComposer } = await load('app/dashboard/questions/new/QuestionComposer.tsx', {
    react: React, 'react/jsx-runtime': jsx, 'next/link': { default: props => jsx.jsx('a', props) },
    '@/components/ActionForm': { ActionForm: ({ children, label }) => jsx.jsxs('form', { children: [children, jsx.jsx('button', { children: label })] }) },
    '@/components/ui/Checkbox': { Checkbox: ({ children, name }) => jsx.jsxs('label', { children: [jsx.jsx('input', { type: 'checkbox', name }), children] }) },
    '@/components/ui/Picker': { Picker: ({ label }) => jsx.jsx('span', { children: label }) },
    '@/components/Captcha': { Captcha: () => null, useCaptcha: () => async () => {} },
    '@/app/actions': { createQuestion() {} }, '@/lib/question-ideas-policy.mjs': policy,
    './ideas-actions': { suggestQuestions() {} }, './questions.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
  });
  for (const props of [{ pro: false, ready: true }, { pro: true, ready: false }, { pro: true, ready: true }]) {
    const html = renderToStaticMarkup(jsx.jsx(QuestionComposer, props));
    assert.match(html, /textarea[^>]*name="body"/); assert.match(html, /Create answer link/); assert.match(html, /public visibility off/);
    assert.ok(html.indexOf('id="draft-title"') < html.indexOf('id="ideas-title"'), 'manual editor comes before the optional assistant');
    assert.match(html, /for="question-body"/);
    assert.match(html, /aria-describedby="question-hint question-count"/);
    assert.match(html, /0 \/ 5,000/);
    assert.match(html, /Nothing is shared publicly automatically/);
    if (props.pro && props.ready) { assert.match(html, /Generate five questions/); assert.match(html, /Only these inputs are sent to OpenAI/); assert.match(html, /name="niche"/); }
    else assert.doesNotMatch(html, /name="niche"/);
  }
});
