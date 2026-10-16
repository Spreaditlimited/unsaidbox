import test from 'node:test';
import assert from 'node:assert/strict';
import { allowancePeriod } from '../lib/plan-policy.mjs';
test('allowance follows exact anniversary rather than calendar month', () => {
  const p = allowancePeriod('2026-10-07T20:54:49Z', new Date('2026-11-01T00:00:00Z'));
  assert.equal(p.start.toISOString(), '2026-10-07T20:54:49.000Z');
  assert.equal(p.end.toISOString(), '2026-11-07T20:54:49.000Z');
  assert.equal(allowancePeriod('2026-10-07T20:54:49Z', p.end).start.toISOString(), p.end.toISOString());
});
test('month end clamps without drifting and annual plans still renew monthly', () => {
  const p = allowancePeriod('2024-01-31T12:00:00Z', new Date('2024-02-29T12:00:00Z'));
  assert.equal(p.end.toISOString(), '2024-03-31T12:00:00.000Z');
  const q = allowancePeriod('2024-02-29T12:00:00Z', new Date('2025-02-28T12:00:00Z'));
  assert.equal(q.end.toISOString(), '2025-03-29T12:00:00.000Z');
});
