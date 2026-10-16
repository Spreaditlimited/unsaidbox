import { createHash } from 'node:crypto';

// Verify the entire bounded file before sending any bytes to the customer.
export async function verifiedExportBytes(response, expectedSize, expectedHash) {
  const maximum = 25 * 1024 * 1024;
  const expected = Number(expectedSize);
  if (!Number.isSafeInteger(expected) || expected < 1 || expected > maximum || !/^[a-f0-9]{64}$/.test(expectedHash || '')) throw new Error('EXPORT_INTEGRITY_FAILED');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('EXPORT_INTEGRITY_FAILED');
  const chunks = [];
  let size = 0;
  const hash = createHash('sha256');
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > expected) throw new Error('EXPORT_INTEGRITY_FAILED');
      hash.update(value);
      chunks.push(Buffer.from(value));
    }
    if (size !== expected || hash.digest('hex') !== expectedHash) throw new Error('EXPORT_INTEGRITY_FAILED');
    return Buffer.concat(chunks);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
