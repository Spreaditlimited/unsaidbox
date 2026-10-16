import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeDatabaseUrl } from '../lib/runtime-database-url.mjs';

const original = 'mysql://unsaidbox_app:test-password@127.0.0.1:13307/unsaidbox?sslaccept=strict&sslcert=%2Flocal%2Fca.pem';
test('local credentials, tunnel and certificate are preserved while pools are bounded', () => {
  const result = new URL(runtimeDatabaseUrl(original, {}));
  assert.equal(result.hostname, '127.0.0.1');
  assert.equal(result.port, '13307');
  assert.equal(result.password, 'test-password');
  assert.equal(result.searchParams.get('sslcert'), '/local/ca.pem');
  assert.equal(result.searchParams.get('connection_limit'), '3');
});
test('production uses one connection per instance and finite queue/connect/idle timeouts', () => {
  for (const suffix of ['', '&connection_limit=100&pool_timeout=0&connect_timeout=0&max_idle_connection_lifetime=300', '&connection_limit=2&connection_limit=99&pool_timeout=NaN']) {
    const url = new URL(runtimeDatabaseUrl(original + suffix, { VERCEL: '1' }));
    for (const [name, expected] of Object.entries({connection_limit:'1', pool_timeout:'10', connect_timeout:'10', max_idle_connection_lifetime:'30'})) {
      assert.deepEqual(url.searchParams.getAll(name), [expected]);
    }
  }
});
test('stricter positive local limits survive and zero/invalid/unbounded settings do not', () => {
  const url = new URL(runtimeDatabaseUrl(original + '&connection_limit=1&pool_timeout=5&max_idle_connection_lifetime=15', {}));
  assert.equal(url.searchParams.get('connection_limit'), '1');
  assert.equal(url.searchParams.get('pool_timeout'), '5');
  assert.equal(url.searchParams.get('max_idle_connection_lifetime'), '15');
  for (const value of ['0', '-1', 'NaN', 'Infinity', '999999', '1.5']) {
    assert.equal(new URL(runtimeDatabaseUrl(original + '&connection_limit=' + value, {})).searchParams.get('connection_limit'), '3');
  }
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
