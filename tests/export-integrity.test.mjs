import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifiedExportBytes } from '../lib/export-integrity.mjs';
const digest = text => createHash('sha256').update(text).digest('hex');
test('export download verifies exact bytes before delivering them', async () => {
  const text = 'response\r\nhello\r\n';
  const bytes = await verifiedExportBytes(new Response(text), BigInt(Buffer.byteLength(text)), digest(text));
  assert.equal(bytes.toString(), text);
});
test('truncated, oversized or corrupted provider responses fail closed', async () => {
  for (const text of ['ab', 'abcd', 'xyz']) {
    await assert.rejects(verifiedExportBytes(new Response(text), 3, digest('abc')), /EXPORT_INTEGRITY_FAILED/);
  }
});
test('missing integrity metadata and unreasonable sizes are rejected', async () => {
  for (const size of [null, 0, -1, 26*1024*1024]) {
    await assert.rejects(verifiedExportBytes(new Response('abc'), size, digest('abc')), /EXPORT_INTEGRITY_FAILED/);
  }
  await assert.rejects(verifiedExportBytes(new Response('abc'), 3, null), /EXPORT_INTEGRITY_FAILED/);
});
