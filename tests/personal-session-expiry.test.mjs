import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as security from '../lib/security.mjs';

const source = await readFile('lib/auth.ts', 'utf8');
function fixture({ cookie = 'a'.repeat(64), session = null, databaseError } = {}) {
  const exports = {};
  let reads = 0;
  const database = { session: { findUnique: async () => {
    reads++;
    if (databaseError) throw databaseError;
    return session;
  } } };
  const dependencies = {
    'server-only': {},
    'next/headers': { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) },
    'next/navigation': { redirect: path => { throw Object.assign(new Error('redirect'), { destination: path }); } },
    './db': { db: () => database },
    './security.mjs': security,
    './account-activity': { recordAccountActivity: () => {} },
  };
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Date, process, require: name => {
    if (!(name in dependencies)) throw Error(`Unexpected import ${name}`);
    return dependencies[name];
  } });
  return { ...exports, reads: () => reads };
}

test('missing, malformed, revoked and expired personal sessions redirect to login, not Not Found', async () => {
  for (const options of [
    { cookie: '' }, { cookie: 'invalid' }, {},
    { session: { expiresAt: new Date(Date.now()-1000), account: { id: 'owner', status: 'ACTIVE' } } },
    { session: { expiresAt: new Date(Date.now()+60000), account: { id: 'owner', status: 'SUSPENDED' } } },
  ]) {
    const auth = fixture(options);
    await assert.rejects(auth.requireAccount(), error => error.destination === '/login');
    if ('cookie' in options) assert.equal(auth.reads(), 0);
  }
});

test('valid personal sessions retain access; inactive accounts go to their dashboard', async () => {
  const account = { id: 'owner', status: 'ACTIVE' };
  assert.equal(await fixture({session:{expiresAt:new Date(Date.now()+60000),account}}).requireAccount(), account);
  const auth = fixture({session:{expiresAt:new Date(Date.now()+60000),account:{...account,status:'PENDING'}}});
  await assert.rejects(auth.requireAccount(), error => error.destination === '/dashboard');
  assert.equal((await auth.requireAccount(false)).id,'owner');
});

test('database outages are not mistaken for expired sessions or Not Found', async () => {
  const error = Error('database unavailable');
  await assert.rejects(fixture({databaseError:error}).requireAccount(), failure => failure === error);
});

test('question and response action error handling preserves framework redirects', async () => {
  const actions = await readFile('app/actions.ts','utf8');
  assert.match(actions, /function failure\(error: unknown\): Result\s*\{\s*unstable_rethrow\(error\)/);
});
