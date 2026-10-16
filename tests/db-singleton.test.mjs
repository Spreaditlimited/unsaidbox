import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
test('database client is reused across calls and module reloads; no per-request disconnect/retry', async () => {
  const source = await readFile('lib/db.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  let clients = 0;
  const globalThis = {};
  const modules = { 'server-only': {}, '@/generated/prisma': { PrismaClient: class { constructor() { clients++; } } }, './runtime-database-url.mjs': { runtimeDatabaseUrl: () => 'fixture' } };
  const load = () => { const exports = {}; vm.runInNewContext(code, { exports, globalThis, process: { env: {} }, require: name => modules[name] }); return exports.db; };
  const first = load(), second = load();
  assert.equal(first(), first());
  assert.equal(first(), second());
  assert.equal(clients, 1);
  assert.doesNotMatch(source, /\$disconnect|setInterval|setTimeout/);
});
