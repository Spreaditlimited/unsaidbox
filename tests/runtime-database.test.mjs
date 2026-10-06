import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeDatabaseUrl } from '../lib/runtime-database-url.mjs';

const original = 'mysql://unsaidbox_app:test-password@127.0.0.1:13307/unsaidbox?sslaccept=strict&sslcert=%2Flocal%2Fca.pem';
test('local database configuration is preserved exactly', () => {
  assert.equal(runtimeDatabaseUrl(original, {}), original);
});
test('Vercel uses the bundled CA and preserves credentials and strict TLS', () => {
  const result = new URL(runtimeDatabaseUrl(original, { VERCEL: '1' }));
  assert.equal(result.searchParams.get('sslcert'), `${process.cwd()}/certificates/mysql-ca.pem`);
  assert.equal(result.searchParams.get('sslaccept'), 'strict');
  assert.equal(result.password, 'test-password');
  assert.equal(result.port, '13307');
});
test('Vercel fails closed for missing certificates or insecure configuration', () => {
  assert.throws(() => runtimeDatabaseUrl(original, { VERCEL: '1' }, '/nonexistent-unsaidbox-test'));
  assert.throws(() => runtimeDatabaseUrl(original.replace('strict', 'accept_invalid_certs'), { VERCEL: '1' }));
  assert.throws(() => runtimeDatabaseUrl(original.replace('/unsaidbox?', '/other?'), { VERCEL: '1' }));
});
