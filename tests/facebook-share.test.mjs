import test from 'node:test';
import assert from 'node:assert/strict';
import { copyResponseAndOpenPost, copyResponseText } from '../lib/share.mjs';

test('modern clipboard remains preferred', async () => {
  let copied;
  await copyResponseText('edited text', { navigator: { clipboard: { writeText: async text => { copied = text; } } } });
  assert.equal(copied, 'edited text');
});
test('HTTP LAN fallback copies synchronously and restores focus, including failures', () => {
  for (const success of [true, false]) {
    const events = [];
    const field = { style: {}, focus: () => {}, select: () => events.push('selected'), setSelectionRange: () => {}, remove: () => events.push('removed') };
    const browser = { navigator: {}, document: {
      activeElement: { focus: () => events.push('restored') },
      createElement: () => field, body: { appendChild: () => {} },
      execCommand: command => { assert.equal(command, 'copy'); events.push('copy'); return success; },
    } };
    if (success) copyResponseText('edited text', browser);
    else assert.throws(() => copyResponseText('edited text', browser), /Clipboard unavailable/);
    assert.equal(field.value, 'edited text');
    assert.deepEqual(events, ['selected', 'copy', 'removed', 'restored']);
  }
});

const url = 'https://www.facebook.com/example/posts/123';
test('copies edited text and reserves a detached tab before awaiting clipboard', async () => {
  const events = [];
  let resolveCopy;
  const tab = { opener: {}, closed: false, location: { replace: value => events.push(value) } };
  const result = copyResponseAndOpenPost('  Edited response  ', url, {
    copy: text => { events.push(text); return new Promise(resolve => { resolveCopy = resolve; }); },
    open: () => { events.push('open'); return tab; },
  });
  assert.deepEqual(events, ['Edited response', 'open']);
  assert.equal(tab.opener, null);
  resolveCopy();
  assert.equal(await result, 'opened');
  assert.deepEqual(events, ['Edited response', 'open', url]);
});
test('clipboard rejection closes reserved tab without navigating', async () => {
  let closed = false;
  assert.equal(await copyResponseAndOpenPost('response', url, {
    copy: () => Promise.reject(new Error('denied')),
    open: () => ({ close: () => { closed = true; }, location: { replace: () => assert.fail('must not navigate') } }),
  }), 'copy-failed');
  assert.equal(closed, true);
});
test('missing clipboard does not open a tab', async () => {
  assert.equal(await copyResponseAndOpenPost('response', url, {
    copy: () => { throw new Error('unsupported'); }, open: () => assert.fail('must not open'),
  }), 'copy-failed');
});
test('blocked popup preserves successful copy for manual link fallback', async () => {
  for (const open of [() => null, () => { throw new Error('blocked'); }, () => ({ closed: true })]) {
    assert.equal(await copyResponseAndOpenPost('response', url, { copy: async () => {}, open }), 'copied');
  }
});
test('missing or unsafe Facebook URL and empty response perform no actions', async () => {
  for (const [body, post] of [['text', ''], ['text', 'https://evil.test'], ['text', 'javascript:alert(1)'], [' ', url]]) {
    assert.equal(await copyResponseAndOpenPost(body, post, {
      copy: () => assert.fail('must not copy'), open: () => assert.fail('must not open'),
    }), 'invalid');
  }
});
