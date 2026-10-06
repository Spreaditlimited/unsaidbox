import test from 'node:test';
import assert from 'node:assert/strict';
import { newQuestionState, canSubmit, canViewQuestion, canViewResponse, canDiscover, ownsResource, canShareResponse } from '../lib/publishing.mjs';
import { wrapLines, paginateLines, facebookPostUrl } from '../lib/share.mjs';
import { validateDatabaseUrl, buildDatabaseUrl } from '../lib/database-url.mjs';

const account = { status: 'ACTIVE', publicPageEnabled: true };
test('new question collects responses without being public or having a social link', () => {
  const q = newQuestionState();
  assert.equal(canSubmit(q, account), true);
  assert.equal(canViewQuestion(q, account), false);
  assert.equal(canDiscover(q, account), false);
});
test('disabled link, closed collection, pending and suspended owners reject submissions', () => {
  assert.equal(canSubmit({ ...newQuestionState(), linkActive: false }, account), false);
  assert.equal(canSubmit({ ...newQuestionState(), acceptingResponses: false }, account), false);
  for (const status of ['PENDING', 'SUSPENDED', undefined]) assert.equal(canSubmit(newQuestionState(), { status }), false);
});
test('closing responses does not remove public question', () => {
  assert.equal(canViewQuestion({ ...newQuestionState(), acceptingResponses: false, publicVisible: true }, account), true);
});
test('public page opt-in and discovery approval are independent', () => {
  const q = { ...newQuestionState(), publicVisible: true, discoverable: true };
  assert.equal(canViewQuestion(q, { ...account, publicPageEnabled: false }), false);
  assert.equal(canDiscover(q, account), false);
  assert.equal(canDiscover({ ...q, discoveryApproved: true }, account), true);
});
test('public question never automatically publishes responses', () => {
  const q = { ...newQuestionState(), publicVisible: true };
  const response = { status: 'APPROVED', sharingPolicy: 'OWNER_MAY_SHARE', publicVisible: false };
  assert.equal(canViewResponse(response, q, account), false);
  assert.equal(canViewResponse({ ...response, publicVisible: true }, q, account), true);
  assert.equal(canViewResponse({ ...response, publicVisible: true, sharingPolicy: 'PRIVATE_ONLY' }, q, account), false);
});
test('share export requires approval, not public visibility', () => {
  assert.equal(canShareResponse({ status: 'APPROVED', sharingPolicy: 'OWNER_MAY_SHARE', publicVisible: false }), true);
  assert.equal(canShareResponse({ status: 'PENDING', sharingPolicy: 'OWNER_MAY_SHARE' }), false);
  assert.equal(canShareResponse({ status: 'APPROVED', sharingPolicy: 'PRIVATE_ONLY' }), false);
});
test('ownership fails closed', () => {
  assert.equal(ownsResource('one', { accountId: 'one' }), true);
  assert.equal(ownsResource('two', { accountId: 'one' }), false);
  assert.equal(ownsResource(undefined, {}), false);
});
test('wrapping preserves paragraphs and splits long tokens', () => {
  assert.deepEqual(wrapLines('hello world\n\nabcdefghijk', 5, s => s.length), ['hello', 'world', '', 'abcde', 'fghij', 'k']);
});
test('pagination preserves all lines and enforces readable pages', () => {
  const lines = Array.from({ length: 27 }, (_, i) => String(i));
  const pages = paginateLines(lines, 10);
  assert.deepEqual(pages.map(p => p.length), [10, 10, 7]);
  assert.deepEqual(pages.flat(), lines);
  assert.throws(() => paginateLines(lines, 0));
});
test('social URL validation rejects scripts and lookalikes', () => {
  for (const url of ['javascript:alert(1)', 'https://facebook.com.evil.test/post', 'https://evil.test', 'http://facebook.com/post', 'https://evil@facebook.com/post']) assert.equal(facebookPostUrl(url), null);
  assert.equal(facebookPostUrl('https://www.facebook.com/example/posts/123'), 'https://www.facebook.com/example/posts/123');
});
test('database guard never falls back to the existing website database', () => {
  assert.throws(() => validateDatabaseUrl(undefined));
  assert.throws(() => validateDatabaseUrl('mysql://user:password@localhost/linescout'));
  assert.throws(() => validateDatabaseUrl('mysql://user@localhost/unsaidbox'));
  const url = 'mysql://unsaidbox_app:example@localhost/unsaidbox?sslaccept=strict';
  assert.equal(validateDatabaseUrl(url), url);
});

test('configuration safely encodes password characters without changing the secret', () => {
  const password = 'aA7!+/=#?%"$@:';
  const url = new URL(buildDatabaseUrl({ host: 'db.example.com', password }));
  assert.equal(decodeURIComponent(url.password), password);
  assert.equal(url.pathname, '/unsaidbox');
  assert.equal(url.searchParams.get('sslaccept'), 'strict');
  assert.equal(url.searchParams.get('connect_timeout'), '10');
  assert.equal(url.href.includes('"'), false);
});
test('connection refuses elevated users and disabled certificate validation', () => {
  for (const url of [
    'mysql://root:secret@localhost/unsaidbox?sslaccept=strict',
    'mysql://unsaidbox_app:secret@localhost/unsaidbox',
    'mysql://unsaidbox_app:secret@localhost/unsaidbox?sslaccept=accept_invalid_certs',
    'mysql://unsaidbox_app:secret@localhost/unsaidbox?sslaccept=strict&sslaccept=accept_invalid_certs',
  ]) assert.throws(() => validateDatabaseUrl(url));
  assert.throws(() => buildDatabaseUrl({ host: 'evil/path?param', password: 'secret' }));
});
